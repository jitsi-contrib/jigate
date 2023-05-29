const freeswitchConfig = {
    host: process.env.FREESWITCH_SERVER || 'localhost',
    port: parseInt(process.env.FREESWITCH_ESL_PORT || '8021'),
    password: process.env.FREESWITCH_ESL_PASSWORD || 'password'
};

export default freeswitchConfig;
