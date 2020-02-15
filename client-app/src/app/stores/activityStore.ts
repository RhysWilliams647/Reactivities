import { observable, action, computed, configure, runInAction } from 'mobx';
import { createContext, SyntheticEvent } from 'react';
import { IActivity } from '../models/activity';
import agent from '../api/agent';

configure({enforceActions: "always"});

class ActivityStore {
    @observable activityRegistry = new Map();
    @observable activity: IActivity | null = null;
    @observable loadingInitial = false;
    @observable submitting = false;
    @observable target = '';

    @computed get activitiesByDate() {
        return Array.from(this.activityRegistry.values()).sort(
            (a, b) => Date.parse(a.date) - Date.parse(b.date)
        );
    }

    @action loadActivities = async () => {
        this.loadingInitial = true;
        try {
            const activities = await agent.Activities.list();
            runInAction('loading activities', () => {
                activities.forEach(activity => {
                    activity.date = activity.date.split('.')[0];
                    this.activityRegistry.set(activity.id, activity);
                });
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
        if(activity){
            this.activity = activity;
        }else{
            this.loadingInitial = true;
            try{
                activity = await agent.Activities.details(id);
                runInAction('Loading activity', () => {
                    activity.date = activity.date.split('.')[0];
                    this.activity = activity;
                    this.loadingInitial = false;
                });
            }catch(err){
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

            runInAction('Creating activity', () => {
                this.activityRegistry.set(activity.id, activity);
                this.activity = activity;
                this.submitting = false;
            });
        } catch (err) {
            runInAction('Create activities error', () => {
                this.submitting = false;
            });
            console.log(err);
        }
    }

    @action editActivity = async (activity: IActivity) => {
        this.submitting = true;
        try{
            await agent.Activities.edit(activity);

            runInAction('Editing activity', () => {
                this.activityRegistry.set(activity.id, activity);
                this.activity = activity;
                this.submitting = false;
            });
        }catch(err){
            runInAction('Editing activities error', () => {
                this.submitting = false;
            });
            console.log(err);
        }
    }

    @action deleteActivity = async (event: SyntheticEvent<HTMLButtonElement>, id: string) => {
        this.submitting = true;
        this.target = event.currentTarget.name;
        try{
            await agent.Activities.delete(id);

            runInAction('Deleting activity', () => {
                this.activityRegistry.delete(id);
                this.submitting = false;
                this.target ='';
            });
        }catch(err){
            runInAction('Deleting activities error', () => {
                this.submitting = false;
                this.target ='';
            });
            console.log(err); 
        }
    }
}

export default createContext(new ActivityStore());