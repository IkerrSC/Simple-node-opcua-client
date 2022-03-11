const {
    OPCUAClient,
    AttributeIds,
    ClientSubscription,
    TimestampsToReturn
} = require("node-opcua");
const async = require("async");

const ServerIP="192.168.62.113";
const ServerPort="4840"
const nodeId = "ns=4;s=SYS_UP";

const client = OPCUAClient.create({ endpointMustExist: false });
var endpointUrl = "opc.tcp://" + ServerIP + ":" + ServerPort;
console.log(endpointUrl);

/** @type ClientSession */
let theSession = null;

/** @type ClientSubscription */
let theSubscription = null;

async.series([
    // step 1 : connect to
   // step 1 : connect to
    function (callback) {
        client.connect(endpointUrl, function (err) {
            if (err) {
                console.log(" cannot connect to endpoint :", endpointUrl);
            } else {
                console.log("connected !");
            }
            callback(err);
        });
    },

    // step 2 : createSession
    function (callback) {
        userIdentity = {
            userName: "adm",
            password: "adm"
        };
        client.createSession(userIdentity, function (err, session) {
            if (!err) {
                theSession = session;
            }
            callback(err);
        });

    },
    // step 5: install a subscription and monitored item
    //
    // -----------------------------------------
    // create subscription
    function (callback) {

        theSession.createSubscription2({
            requestedPublishingInterval: 1000,
            requestedLifetimeCount: 1000,
            requestedMaxKeepAliveCount: 20,
            maxNotificationsPerPublish: 10,
            publishingEnabled: true,
            priority: 10
        }, function (err, subscription) {
            if (err) { return callback(err); }
            theSubscription = subscription;

            theSubscription.on("SYS_UP", function (r) {
                console.log("keepalive", r);
            }).on("terminated", function () {
            });
            callback();
        });

    }, function (callback) {
        // install monitored item
        theSubscription.monitor({
            nodeId,
            attributeId: AttributeIds.Value
        },
            {
                samplingInterval: 100,
                discardOldest: true,
                queueSize: 10
            }, TimestampsToReturn.Both,
            (err, monitoredItem) => {
                monitoredItem
                    .on("changed", function (value) {
                        console.log(" New Value = ", value.toString());
                    })
                    .on("err", (err) => {
                        console.log("MonitoredItem err =", err.message);
                    });
                callback(err);

            });
    },

    // close session
    function (callback) {
        console.log("Waiting 4 seconds")
        setTimeout(() => {
            theSubscription.terminate();
            callback();
     }, 4000);

    }, function (callback) {
        console.log(" closing session");
        theSession.close(function (err) {
            console.log(" session closed");
            callback();
        });
    }
],
function(err) {
  if (err) { console.log(" failure ",err); }
  else { console.log('done!'); }
  client.disconnect(function(){});
});