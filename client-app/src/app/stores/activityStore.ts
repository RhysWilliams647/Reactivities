import { observable, action, computed, runInAction, reaction, toJS } from 'mobx';
import { SyntheticEvent } from 'react';
import { IActivity } from '../models/activity';
import agent from '../api/agent';
import { history } from '../..';
import { toast } from 'react-toastify';
import { RootStore } from './rootStore';
import { setActivityProps, createAttendee } from '../common/util/util';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import jwt from 'jsonwebtoken';

const LIMIT = 2;

export default class ActivityStore {
    
    rootStore: RootStore;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;

        reaction(
            () => this.predicate.keys(),
            () => {
                this.page = 0;
                this.activityRegistry.clear();
                this.loadActivities();
            }
        );
    }

    @observable activityRegistry = new Map();
    @observable activity: IActivity | null = null;
    @observable loadingInitial = false;
    @observable submitting = false;
    @observable target = '';
    @observable loading = false;
    @observable.ref hubConnection: HubConnection | null = null;
    @observable activityCount: number = 0;
    @observable page: number = 0;
    @observable predicate = new Map();

    @computed get totalPages() {
        return Math.ceil(this.activityCount / LIMIT);
    }

    @computed get axiosParams(){
        const params = new URLSearchParams();
        params.append('limit', String(LIMIT));
        params.append('offset', `${this.page ? this.page * LIMIT : 0}`);
        this.predicate.forEach((value, key) => {
            if(key === 'startDate')
                params.append(key, value.toISOString());
            else
                params.append(key, value);
        });
        return params;
    }

    @action setPredicate = (predicate: string, value: string | Date) => {
        this.predicate.clear();

        if(predicate !== 'all'){
            this.predicate.set(predicate, value);
        }
    }

    @action setPage = (page: number) => {
        this.page = page;
    }

    @action createHubConnection = (activityId: string) => {
        this.hubConnection = new HubConnectionBuilder()
            .withUrl(process.env.REACT_APP_API_CHAT_URL!, {
                accessTokenFactory: () => this.checkTokenAndRefreshIfExpired()
            })
            .configureLogging(LogLevel.Information)
            .build();

        this.hubConnection
            .start()
            .then(() => console.log('state of connection', this.hubConnection!.state))
            .then(() => {
                console.log('Attempting to join group');
                if (this.hubConnection!.state === 'Connected')
                    this.hubConnection!.invoke('AddToGroup', activityId)
            })
            .catch(error => console.log('Error establishing connection: ', error));

        this.hubConnection.on('ReceiveComment', comment => {
            runInAction(() => {
                this.activity!.comments.push(comment)
            })
        })

        // this.hubConnection.on('Send', message => {
        //   toast.info(message);
        // })
    };

    checkTokenAndRefreshIfExpired = async () => {
        const token = localStorage.getItem('jwt');
        const refreshToken = localStorage.getItem('refreshToken');

        if(token && refreshToken){
            const decodedToken: any = jwt.decode(token);
            if(decodedToken && Date.now() >= decodedToken.exp * 1000 - 5000){
                try{
                    return await agent.User.refreshToken(token, refreshToken);
                }catch (err){
                    toast.error('Problem connecting to the chat');
                }
            }
            else
                return token;
        }
    };

    @action stopHubConnection = () => {
        this.hubConnection!.invoke('RemoveFromGroup', this.activity!.id)
            .then(() => {
                this.hubConnection!.stop()
            })
            .then(() => console.log('Connection stopped'))
            .catch(err => console.log(err))
    }

    @action addComment = async (values: any) => {
        values.activityId = this.activity!.id;

        try {
            await this.hubConnection!.invoke('SendComment', values)
        } catch (err) {
            console.log(err);
        }
    }

    @computed get activitiesByDate() {
        return this.groupActivitiesByDate(Array.from(this.activityRegistry.values()));
    }

    groupActivitiesByDate = (activities: IActivity[]) => {
        const sortedActivities = activities.sort(
            (a, b) => a.date.getTime() - b.date.getTime()
        )

        return Object.entries(sortedActivities.reduce((activities, activity) => {
            const date = activity.date.toISOString().split('T')[0];
            activities[date] = activities[date] ? [...activities[date], activity] : [activity];
            return activities;
        }, {} as { [key: string]: IActivity[] }));
    }

    @action loadActivities = async () => {
        this.loadingInitial = true;
        try {
            const activitiesEnvelope = await agent.Activities.list(this.axiosParams);
            const { activities, activityCount } = activitiesEnvelope;
            runInAction('loading activities', () => {
                activities.forEach(activity => {
                    setActivityProps(activity, this.rootStore.userStore.user!);
                    this.activityRegistry.set(activity.id, activity);
                });
                this.activityCount = activityCount;
                this.loadingInitial = false;
            });
        } catch (err) {
            runInAction('loading activities error', () => {
                this.loadingInitial = false;
            });
            console.log(err);
        }
    }

    @action loadActivity = async (id: string) => {
        let activity = this.getActivity(id);
        if (activity) {
            this.activity = activity;
            return toJS(activity);
        } else {
            this.loadingInitial = true;
            try {
                activity = await agent.Activities.details(id);
                runInAction('Loading activity', () => {
                    setActivityProps(activity, this.rootStore.userStore.user!);
                    this.activity = activity;
                    this.activityRegistry.set(activity.id, activity);
                    this.loadingInitial = false;
                });
                return activity;
            } catch (err) {
                runInAction('Loading activity error', () => {
                    this.loadingInitial = false;
                });
                console.log(err);
            }
        }
    }

    @action clearActivity = () => {
        this.activity = null;
    }

    getActivity = (id: string) => {
        return this.activityRegistry.get(id);
    }

    @action createActivity = async (activity: IActivity) => {
        this.submitting = true;

        try {
            await agent.Activities.create(activity);

            const attendee = createAttendee(this.rootStore.userStore.user!);
            attendee.isHost = true;
            let attendees = [];
            attendees.push(attendee);
            activity.attendees = attendees;
            activity.isHost = true;
            activity.comments = [];

            runInAction('Creating activity', () => {
                this.activityRegistry.set(activity.id, activity);
                this.activity = activity;
                this.submitting = false;
            });
            history.push(`/activities/${activity.id}`);
        } catch (err) {
            runInAction('Create activities error', () => {
                this.submitting = false;
            });
            toast.error('Problem submitting data');
            console.log(err.response);
        }
    }

    @action editActivity = async (activity: IActivity) => {
        this.submitting = true;
        try {
            await agent.Activities.edit(activity);

            runInAction('Editing activity', () => {
                this.activityRegistry.set(activity.id, activity);
                this.activity = activity;
                this.submitting = false;
            });
            history.push(`/activities/${activity.id}`);
        } catch (err) {
            runInAction('Editing activities error', () => {
                this.submitting = false;
            });
            toast.error('Problem submitting data');
            console.log(err.response);
        }
    }

    @action deleteActivity = async (event: SyntheticEvent<HTMLButtonElement>, id: string) => {
        this.submitting = true;
        this.target = event.currentTarget.name;
        try {
            await agent.Activities.delete(id);

            runInAction('Deleting activity', () => {
                this.activityRegistry.delete(id);
                this.submitting = false;
                this.target = '';
            });
        } catch (err) {
            runInAction('Deleting activities error', () => {
                this.submitting = false;
                this.target = '';
            });
            console.log(err);
        }
    }

    @action attendActivity = async () => {
        const attendee = createAttendee(this.rootStore.userStore.user!);
        this.loading = true;
        try {
            await agent.Activities.attend(this.activity!.id);
            runInAction(() => {
                if (this.activity) {
                    this.activity.attendees.push(attendee);
                    this.activity.isGoing = true;
                    this.activityRegistry.set(this.activity.id, this.activity);
                    this.loading = false;
                }
            });
        } catch (err) {
            runInAction(() => {
                this.loading = false;
                toast.error('An error has occurred signing up to activity');
            })
        }
    }

    @action cancelAttendance = async () => {
        this.loading = true;
        try {
            await agent.Activities.unattend(this.activity!.id);
            runInAction(() => {
                if (this.activity) {
                    this.activity.attendees = this.activity.attendees.filter((attendee) =>
                        attendee.username !== this.rootStore.userStore.user!.username
                    );
                    this.activity.isGoing = false;
                    this.activityRegistry.set(this.activity.id, this.activity);
                    this.loading = false;
                }
            });
        } catch (err) {
            runInAction(() => {
                this.loading = false;
                toast.error('An error has occurred cancelling attendance');
            });
        }
    }
}