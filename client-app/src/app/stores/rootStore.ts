import ActivityStore from "./activityStore";
import UserStore from "./userStore";
import { createContext } from "react";
import { configure } from "mobx";
import CommonStore from "./commonStore";
import ModalStore from "./modalStore";

configure({enforceActions: "always"});

export class RootStore{
    activityStore: ActivityStore;
    commonStore: CommonStore;
    modalStore: ModalStore;
    userStore: UserStore;

    constructor(){
        this.activityStore = new ActivityStore(this);
        this.commonStore = new CommonStore(this);
        this.modalStore = new ModalStore(this);
        this.userStore = new UserStore(this);
    }
}

export const RootStoreContext = createContext(new RootStore());