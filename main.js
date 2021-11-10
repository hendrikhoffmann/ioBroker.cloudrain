"use strict";

/*
* Created with @iobroker/create-adapter v2.0.1
Adapter for the Cloudrain Smart Irrigation System See https://cloudrain.com/.
*/

const utils = require("@iobroker/adapter-core");
const got = require('got');
const { resolve } = require("path");
const { rejects } = require("assert");
const { default: SelectInput } = require("@material-ui/core/Select/SelectInput");
const shortestAllowedPollInterval = 60;
const pollIntervalDuringIrrigation = 10;

class Cloudrain extends utils.Adapter {
    
    static cloudRainClientId = "939c77e3-3f10-11ec-9174-03e164aff1e5";
    static cloudRainClientSecret = "939c8343-3f10-11ec-b4ad-03e164aff1e5";
    cloudRainZones = {};
    mainLoopIntervalID =0;
    rapidUpdateTimerID =0;
    cloudRainAccessToken = '';
    cloudRainRefreshToken = '';
    cloudRainTokenExpireIn = 0;
    cloudRainTokenValid = false;
    
    /**
    * @param {Partial<utils.AdapterOptions>} [options={}]
    */
    constructor(options) {
        super({
            ...options,
            name: "cloudrain",
        });
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        // this.on("objectChange", this.onObjectChange.bind(this));
        // this.on("message", this.onMessage.bind(this));
        this.on("unload", this.onUnload.bind(this));
    }
    
    /**
    * Is called when databases are connected and adapter received configuration.
    */
    async onReady() {
        // Initialize adapter
        
        await this.getCloudRainToken();
        this.debugLogConnectionState();
        
        if (this.getConnected()) {
            await this.createOrUpdateCloudRainControllers();
            await this.createOrUpdateCloudRainZones();
            this.updateIrrigationStatus();
            this.initIrrigationStatusLoop();
            this.log.debug("Init successful");
        } else {
            this.log.warn("Unable to Connect to Cloudrain API. Make sure Username and Password are correct and https://api.cloudrain.com/v1/ is reachable from your Network.");
            this.log.warn("No further retries. Restart the adapter manually.");
        }
    }
    
    /**
    * Is called when adapter shuts down - callback has to be called under any circumstances!
    * @param {() => void} callback
    */
    onUnload(callback) {
        
        try {
            if (this.mainLoopIntervalID != 0) {
                clearInterval( this.mainLoopIntervalID);
            }
            if (this.rapidUpdateTimerID !=0) { 
                this.clearTimeout(this.rapidUpdateTimerID);
            }
            this.setConnected(false);
            
            callback();
        } catch (e) {
            callback();
        }
    }
    
    /**
    * Is called if a subscribed state changes
    * @param {string} id
    * @param {ioBroker.State | null | undefined} state
    */
    onStateChange(id, state) {
        
        if (state) {
            // The state was changed
            const splitId = id.split('.');
            const value = splitId.pop();
            if (value == "startIrrigation") {
                const zoneId = splitId.pop();
                if (zoneId && zoneId.length > 0) {
                    this.updateZoneIrrigation(zoneId,state.val);
                }
            } else {
                this.log.debug(`unhandled state change. State: ${id} changed: ${state.val} (ack = ${state.ack})`);
            }
            
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }
    
    debugLogConnectionState(){
        
        this.log.debug(`cloudRainTokenValid: ${this.getConnected()}` );
        //this.log.debug(`cloudRainAccessToken: ${this.cloudRainAccessToken}`);
        //this.log.debug(`cloudRainRefreshToken: ${this.cloudRainRefreshToken}`);
        this.log.debug(`cloudRainTokenExpireIn: ${this.cloudRainTokenExpireIn}`);
    }
    
    async getCloudRainToken(){
        
        if (this.getConnected()) return true;
        
        const options = {
            "method": "POST",
            "url": "https://api.cloudrain.com/v1/token",
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            form: {
                "grant_type": "password",
                "client_id": Cloudrain.cloudRainClientId,
                "client_secret": Cloudrain.cloudRainClientSecret,
                "username": this.config.Username,
                "password": this.config.Password,
                "scope": "read start_irrigation"
            }
        };
        try {
            const response = await got(options);
            const resp = JSON.parse(response.body);
            if (resp.token_type && resp.token_type == "Bearer" ){
                this.cloudRainAccessToken   = resp.access_token;
                this.cloudRainRefreshToken  = resp.refresh_token;
                this.cloudRainTokenExpireIn = resp.expires_in;
                if (this.cloudRainAccessToken && this.cloudRainRefreshToken) {
                    this.setConnected(true);
                    this.log.debug("Cloudrain Token generation successful.");
                }
            } else {
                this.log.warn(`Get Cloudrain Token failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Get Cloudrain Token request failed. Check network connection.");
        }
    }
    async createOrUpdateCloudRainControllers(){
        
        await this.getCloudRainToken();
        if (!this.getConnected())  return false;
        
        const options = {
            "method": "GET",
            "url": "https://api.cloudrain.com/v1/controllers",
            "headers": {
                "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
        };
        try {
            const response = await got(options);
            if (response.statusCode == 200){
                const resp = JSON.parse(response.body);
                const userControllers = resp.userControllers;
                userControllers.forEach((controller) => {
                    this.log.debug(`Controller found: controllerId: ${controller.controllerId} controllerName: ${controller.controllerName}`);
                    this.setObjectNotExistsAsync(controller.controllerId, {
                        type: "device",
                        common: {
                            name: controller.controllerName                            
                        },
                        native: {},
                    });
                });
            } else {
                this.setConnected(false);
                this.log.warn(`Get Cloudrain Controllers failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Get Cloudrain Controllers request failed. Check network connection.");
        }
    }
    
    
    async createOrUpdateCloudRainZones(){
        
        await this.getCloudRainToken();
        if (!this.getConnected())  return false;
        
        const options = {
            "method": "GET",
            "url": "https://api.cloudrain.com/v1/zones",
            "headers": {
                "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
        };
        try {
            const response = await got(options);
            if (response.statusCode == 200){
                const resp = JSON.parse(response.body);
                this.cloudRainZones = resp.userZones;
                this.cloudRainZones.forEach((zone) => {
                    this.log.debug(`Zone found: zone: ${zone.zoneId} zoneName: ${zone.zoneName} controllerId: ${zone.controllerId} controllerName: ${zone.controllerName} `);
                    this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId, {
                        type: "channel",
                        common: {
                            name: zone.zoneName                            
                        },
                        native: {},
                    }).then(() => {
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".irrigating" , {
                            type: "state",
                            common: {
                                name: "irrigating",
                                type: "boolean",
                                role: "indicator.state",
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".startTime" , {
                            type: "state",
                            common: {
                                name: "startTime",
                                type: "string",
                                role: "level",
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".plannedEndTime" , {
                            type: "state",
                            common: {
                                name: "plannedEndTime",
                                type: "string",
                                role: "level",
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".duration" , {
                            type: "state",
                            common: {
                                name: "duration",
                                type: "number",
                                unit: "seconds",
                                role: "value",
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".remainingSeconds" , {
                            type: "state",
                            common: {
                                name: "remainingSeconds",
                                type: "number",
                                unit: "seconds",
                                role: "value",
                                read: true,
                                write: false,
                            },
                            native: {},
                        });
                        this.setObjectNotExistsAsync(zone.controllerId + "." + zone.zoneId + ".startIrrigation" , {
                            type: "state",
                            common: {
                                name: "duration",
                                type: "number",
                                unit: "seconds",
                                role: "value",
                                read: true,
                                write: true,
                            },
                            native: {},
                        }).then(() => this.subscribeStates(zone.controllerId + "." + zone.zoneId + ".startIrrigation"));
                    });
                });
            } else {
                this.setConnected(false);
                this.log.warn(`Get Cloudrain Zones failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Get Cloudrain Zones request failed.  Check network connection.");
        }
    }
    
    async updateIrrigationStatus() {
        
        this.log.debug(` updateIrrigationStatus`);
        await this.getCloudRainToken();
        if (!this.getConnected())  return;
        
        // usually, this function is triggered by an intervall
        // during irrigation there is an additional timer for higher freq updates
        // if we are here, we dont need any additional scheduled function calls anymore
        if (this.rapidUpdateTimerID !=0) { 
            this.clearTimeout(this.rapidUpdateTimerID);
            this.rapidUpdateTimerID = 0;
        }
        const options = {
            "method": "GET",
            "url": "https://api.cloudrain.com/v1/irrigations",
            "headers": {
                "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
        };
        try {
            const response = await got(options);
            if (response.statusCode == 200){
                const currentlyRunningZones = JSON.parse(response.body).currentlyRunningZones;
                // reset all non-running zones
                this.cloudRainZones.forEach((zone) => {
                    let found = false;
                    currentlyRunningZones.forEach((currentZone) => {    
                        if (currentZone.zoneId == zone.zoneId) found = true;
                    });
                    if (!found) {
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".irrigating",       { val: false, ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".startTime",        { val: "--:--", ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".plannedEndTime",   { val: "--:--", ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".duration",         { val: 0, ack: true });
                        this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".remainingSeconds", { val: 0, ack: true });
                    }
                });
                // update all running zones
                let irrigating = false;
                currentlyRunningZones.forEach((zone) => {
                    irrigating = true;
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".irrigating",           { val: true, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".startTime",            { val: zone.startTime, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".plannedEndTime",       { val: zone.plannedEndTime, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".duration",             { val: zone.duration, ack: true });
                    this.setStateAsync(zone.controllerId + "." + zone.zoneId + ".remainingSeconds",     { val: zone.remainingSeconds, ack: true });
                });
                // if any zone is currently running, increase data update intervall
                if (irrigating) this.rapidUpdateTimerID = this.setTimeout(() => {this.rapidUpdateTimerID =0; this.updateIrrigationStatus()}, pollIntervalDuringIrrigation*1000);
                
            } else {
                this.setConnected(false);
                this.log.warn(`Get Cloudrain irrigations failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Get Cloudrain irrigations request failed. Check network connection.");
        }
        
    }
    /**
    * Is called if a irrigation cycle shall be started or stopped after change of the "startIrrigation" value
    * 	   @param {string} zoneId
    *     @param {number} duration
    */
    async updateZoneIrrigation(zoneId,duration) {
        
        await this.getCloudRainToken();
        if (!this.getConnected())  return;
        
        let method = "PUT";
        if (duration == 0) method = "DELETE"; // a duration of 0 will stop a possibly running irrigation
        
        const options = {
            'method': method,
            'url': `https://api.cloudrain.com/v1/zones/${zoneId}/irrigation?duration=${duration}`,
            "headers": {
                "Authorization": "Bearer "+ this.cloudRainAccessToken
            }
        };
        try {
            const response = await got(options);
            if (response.statusCode == 200){
                this.log.info(`Irrigation Command send. Zone: ${zoneId} New Duration: ${duration} `);
                
            } else {
                this.setConnected(false);
                this.log.warn(`Irrigation update failed. StatusCode: ${response.statusCode} Body: ${response.body}`);
            }
        }        
        catch (error) {
            this.setConnected(false);
            this.log.error("Irrigation update request failed. Check network connection.");
        }
        // Issue an additional irrigation Status Update instantly after Irrigation Command
        this.updateIrrigationStatus(); 
    }
    
    /**
    * Is called to Update the "Connected to Cloudrain API with valid Token" status
    * 	   @param {boolean} newCloudRainTokenState
    */
    setConnected(newCloudRainTokenState) {
        
        if (this.cloudRainTokenValid !== newCloudRainTokenState) {
            this.cloudRainTokenValid = newCloudRainTokenState;
            this.setStateAsync('info.connection', newCloudRainTokenState, true);
        }
    }
    
    getConnected() {
        
        return this.cloudRainTokenValid;
    }
    
    /**
    * The main Application loop
    * 	   
    */
    async initIrrigationStatusLoop() {
        let intervalMs = Math.max (shortestAllowedPollInterval,this.config.RequestInterval)*1000;
        this.mainLoopIntervalID = setInterval(() => {
            this.updateIrrigationStatus();
        }, intervalMs);
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
    * @param {Partial<utils.AdapterOptions>} [options={}]
    */
    module.exports = (options) => new Cloudrain(options);
} else {
    // otherwise start the instance directly
    new Cloudrain();
}