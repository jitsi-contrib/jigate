/**
 * FreeSWITCH API.
 */

import { Connection } from 'modesl';
import { ConnectionEvent } from 'modesl/dist/esl/Connection';

import freeswitchConfig from './config';
import Log from './log';

const RESPONSE_SUCCESS = '+OK';

export enum eslLogLevels {
    Emerg,
    Alert,
    Crit,
    Error,
    Warning,
    Notice,
    Info,
    Debug,
}

class Freeswitch {
    connection: Connection | undefined;

    /**
     * Connect to Event Socket or return the existing connection.
     *
     * @return Promise containing the current ESL connection.
     */
    connect = () => new Promise((resolve: (connection: Connection) => void, reject) => {
        if (this.connection && this.connection.connected()) {
            resolve(this.connection);
        } else {
            const { host, port, password } = freeswitchConfig;

            Log.info(`Opening new FreeSWITCH event socket connection to ${host}:${port}...`);
            this.connection = Connection.createInbound({ host, port }, password);

            this.connection.on(ConnectionEvent.Error, () => {
                Log.error('Error connecting to FreeSWITCH!');
                reject('Connection error');
            });

            this.connection.on(ConnectionEvent.End, () => {
                Log.error('Connection to FreeSWITCH ended!');
                reject('Connection ended');
            });

            this.connection.on(ConnectionEvent.Ready, () => {
                Log.info('Connection to FreeSWITCH established!');
                this.connection && resolve(this.connection);
            });
        }
    });

    /**
     * Execute an asynchronous FreeSWITCH command through the Event Socket.
     * NOTE: The returned Promise is resolved no matter the response.
     *       Use executeWithOkResult if you are interested only in successful responses.
     *
     * @return The body of the response, or an error.
     */
    executeAsync = (application: string, argument: string, uuid: string) => new Promise((resolve, reject) => {
        Log.info(`[${uuid}] Executing async dial plan application: ${application} ${argument}`);

        this.connect()
            .then(connection => {
                connection.executeAsync(application, argument, uuid);
            })
            .catch(error => {
                Log.error(`[${uuid}] Error executing async dial plan application ' ${application} ${argument}': ${error.trim()}`);
                reject(error);
            });
    });

    /**
     * Execute a background api FreeSWITCH command through the Event Socket.
     * NOTE: The returned Promise is resolved no matter the response.
     *       Use executeWithOkResult if you are interested only in successful responses.
     *
     * @return The body of the response, or an error.
     */
    bgapi = (command: string, reference: string) => new Promise((resolve: (responseBody: string) => void, reject) => {
        Log.info(`[${reference}] Executing command: ${command}`);

        this.connect()
            .then(connection => {
                connection.bgapi(command, responseEvent => {
                    const responseBody = responseEvent.getBody();
                    resolve(responseBody);
                });
            })
            .catch(error => {
                Log.error(`[${reference}] Error executing command '${command}': ${error.trim()}`);
                reject(error);
            });
    });


    isSuccessfulResponse = (response: string) => {
        return response.indexOf(RESPONSE_SUCCESS) === 0;
    };

    /**
     * Execute a background api FreeSWITCH command through the Event Socket.
     * NOTE: The returned Promise is resolved only if the response is successful.
     *
     * @return The body of the response, or an error.
     */
    executeWithOkResult = (command: string, reference: string) => new Promise((resolve, reject) => {
        this.bgapi(command, reference)
            .then(responseBody => {
                if (this.isSuccessfulResponse(responseBody)) {
                    Log.info(`[${reference}] Command '${command}' executed successfully: ${responseBody.trim()}`);
                    resolve(responseBody);
                } else {
                    Log.error(`[${reference}] Error executing command '${command}': ${responseBody.trim()}`);
                    reject(responseBody);
                }
            })
            .catch(error => {
                reject(error);
            });
    });
}

const freeswitch = new Freeswitch();

export default freeswitch;
