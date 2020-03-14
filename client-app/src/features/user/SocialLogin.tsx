import React from 'react'
import FaceBookLogin from 'react-facebook-login/dist/facebook-login-render-props'
import { Button, Icon } from 'semantic-ui-react';
import { observer } from 'mobx-react-lite';

interface IProps{
    fbCallBack: (response: any) => void;
    loading: boolean;
}

const SocialLogin: React.FC<IProps> = ({fbCallBack, loading}) => {
    return (
        <div>
            <FaceBookLogin
                appId='518498875709419'
                fields='name,email,picture'
                callback={fbCallBack}
                render={(renderProps: any) => (
                    <Button
                        loading={loading}
                        onClick={renderProps.onClick}
                        type='button'
                        fluid
                        color='facebook'
                    >
                        <Icon name='facebook'/>
                        Login with Facebook
                    </Button>
                )}
            />
        </div>
    )
}

export default observer(SocialLogin);
