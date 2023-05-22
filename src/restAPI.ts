import express from 'express';
import Log from './log';
import stats from './stats';

const port = process.env.REST_PORT || 8080;
const restAPI = express()

restAPI.route(`/stats`).get((req: express.Request, res: express.Response) => {
    try {
        res.status(200).send(JSON.stringify(stats));
    } catch (e) {
        res.status(500).send();
    }
})

restAPI.listen(port, () => {
    Log.info(`restAPI is listening on port ${port}`);
});

export default restAPI;
