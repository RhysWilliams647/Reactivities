import { IUser, IUserFormValues } from "../models/user";
import { observable, computed, action, runInAction } from "mobx";
import agent from "../api/agent";
import { RootStore } from "./rootStore";
import { history } from "../..";
import { toast } from "react-toastify";

export default class UserStore {

    rootStore: RootStore;

    constructor(rootStore: RootStore) {
        this.rootStore = rootStore;
    }

    @observable user: IUser | null = null;
    @observable loading = false;

    @computed get isLoggedIn() { return !!this.user; }

    @action login = async (values: IUserFormValues) => {
        try {
            const user = await agent.User.login(values);
            runInAction(() => {
                this.user = user;
            });
            this.rootStore.commonStore.setToken(user.token);
            this.rootStore.commonStore.setRefreshToken(user.refreshToken);
            this.rootStore.modalStore.closeModal();
            history.push('/activities');
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    @action register = async (values: IUserFormValues) => {
        try{
            const user = await agent.User.register(values);
            runInAction(() => {
                this.user = user;
            });
            this.rootStore.commonStore.setToken(user.token);
            this.rootStore.commonStore.setRefreshToken(user.refreshToken);
            this.rootStore.modalStore.closeModal();
            history.push('/activities');
        }catch(err){
            console.log(err);
            throw err;
        }
    }

    @action getUser = async () => {
        try{
            var user = await agent.User.current();
            runInAction(() => {
                this.user = user;
            });
        }catch(err){
            console.log(err);
        }
    }

    @action logout = () => {
        this.rootStore.commonStore.setToken(null);
        this.rootStore.commonStore.setRefreshToken(null);
        this.user = null;
        history.push('/');
    }

    @action fbLogin = async (response: any) => {
        this.loading = true;
        console.log(response);

        try{
            const user = await agent.User.fbLogin(response.accessToken);
            runInAction(() => {
                this.user = user;
                this.rootStore.commonStore.setToken(user.token);
                this.rootStore.commonStore.setRefreshToken(user.refreshToken);
                this.rootStore.modalStore.closeModal();
                this.loading = false;
                history.push('/activities');
            })
        }catch(err){
            runInAction(() => {
                this.loading = false;
            })
            console.log(err);
            toast.error('An error has ocured trying to login with Facebook. Please try again.');
        }
    }
}