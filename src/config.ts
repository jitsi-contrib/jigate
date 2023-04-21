const freeswitchConfig = {
    host: process.env.JIGATE_SERVER || 'localhost',
    port: parseInt(process.env.JIGATE_ESL_PORT || '8021'),
    password: process.env.JIGATE_ESL_PASSWORD || 'password'
};

export default freeswitchConfig;
