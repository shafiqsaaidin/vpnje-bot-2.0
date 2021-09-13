const mysql = require('mysql');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid')
const TelegramBot = require('node-telegram-bot-api');

require('dotenv').config({path: __dirname + '/.env'});

// Set telegram bot API KEY
const token = process.env.BOT_TOKEN;

// Set Admin ID
// let adminUsername = process.env.ADMIN.split(",");

// Initialize telegram bot
const bot = new TelegramBot(token, {polling:true});

// Initialize connection to database
const conn = mysql.createConnection({
    host        : process.env.DB_HOST,
    user        : process.env.DB_USER,
    password    : process.env.DB_PASS,
    database    : process.env.DB_DATABASE,
    multipleStatements: true
});

try {
    conn.connect((err) => {
        if (err) {
            console.log("Error connection: " + err.stack);
        }
    
        // console.log("Connected as: " + conn.threadId);
    });
} catch (err) {
    console.log(error);
}

// Get online user
bot.onText(/\/ovpn_online/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    try {
        conn.query("SELECT COUNT(user_id) AS total FROM user WHERE user_online = 1", (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            Object.keys(result).forEach((key) => {
                let row = result[key];
                // console.log(row.user_name);
    
                bot.sendMessage(chatId, "Total Online: " + row.total + '\n');
            });
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Get user info
bot.onText(/\/ovpn_info (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("SELECT user_name, AES_DECRYPT(user_pass, 'vpnje') as user_pass, user_online, user_enable, user_start_date, user_end_date FROM user WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "user not exist!");
            } else {
                Object.keys(result).forEach((key) => {
                    let row = result[key];
                    let startDate = moment(row.user_start_date).format("YYYY-MM-DD");
                    let endDate;
    
                    if (row.user_end_date === "0000-00-00"){
                        endDate = "Unlimited";
                    } else {
                        endDate = moment(row.user_end_date).format("YYYY-MM-DD");
                    }
        
                    bot.sendMessage(chatId, '## Ovpn user info ## \n'
                            + 'Username: ' + row.user_name + '\n'
                            + 'Password: ' + row.user_pass + '\n'
                            + 'Online: ' + row.user_online + '\n'
                            + 'Enable: ' + row.user_enable + '\n'
                            + 'Start Date: ' + startDate + '\n'
                            + 'Expired Date: ' + endDate);
                });
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Register new user
bot.onText(/\/ovpn_add (.+) (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let userPass = match[2];
    let day = match[3];
    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT user_name FROM user WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                conn.query({
                    sql: "INSERT INTO user (user_name, user_pass, user_start_date, user_end_date) VALUES (?, AES_ENCRYPT(?, 'vpnje'), ?, ?)",
                    values: [userName, userPass, today, expired]
                }, (err, result) => {
                    if (err) throw err;
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## Ovpn register success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'Password: ' + userPass + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);
                });
            } else {
                bot.sendMessage(chatId, "Username taken");
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Renew user
bot.onText(/\/ovpn_renew (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT user_name FROM user WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "User not exist.");
            } else {
                conn.query("UPDATE user SET user_start_date = ?, user_end_date = ? WHERE user_name = ?", [today, expired, userName], (err, result) => {
                    if (err) throw err;
            
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## Ovpn renew success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);
                });
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Block user
bot.onText(/\/ovpn_block (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("UPDATE user SET user_enable = 0 WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, 'Ovpn User: ' + userName + ' blocked!');
        });
    } catch (error) {
        console.log(error);
    }
});

// Unblock user
bot.onText(/\/ovpn_unblock (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("UPDATE user SET user_enable = 1 WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, 'Ovpn User: ' + userName + ' unblocked!');
        });
    } catch (error) {
        console.log(error);
    }
});

// Delete user
bot.onText(/\/ovpn_del (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("DELETE FROM user WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, 'Ovpn User: ' + userName + ' removed!');
        });
    } catch (error) {
        console.log(error);
    }
});

// Reset User pass
bot.onText(/\/ovpn_reset (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let userPass = match[2];

    // console.log(userPass);

    try {
        conn.query("UPDATE user SET user_pass = AES_ENCRYPT(?, 'vpnje') WHERE user_name = ?", [userPass, userName], (err, result) => {
            if (err) throw err;
    
            console.log(result);
        
            bot.sendMessage(chatId, 'Reset Ovpn password success');
        });
    } catch (error) {
        console.log(error);
    }
});

// Block all test account
bot.onText(/\/ovpn_block_test/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    // console.log(userPass);

    try {
        conn.query("UPDATE user SET user_enable = 0 WHERE user_name = 'test'; UPDATE user SET user_enable = 0 WHERE user_name = 'test2'; UPDATE user SET user_enable = 0 WHERE user_name = 'test3'; UPDATE user SET user_enable = 0 WHERE user_name = 'test4'", (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, 'All test acc blocked');
        });
    } catch (error) {
        console.log(error);
    }
});


// Wireguard

// Get user info
bot.onText(/\/wg_info (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("SELECT * FROM wireguard WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "user not exist!");
            } else {
                Object.keys(result).forEach((key) => {
                    let row = result[key];
        
                    bot.sendMessage(chatId, '## Wireguard user info ## \n'
                            + 'Username: ' + row.user_name + '\n'
                            + 'Server Name: ' + row.server_name + '\n'
                            + 'Start Date: ' + moment(row.user_start_date).format("YYYY-MM-DD") + '\n'
                            + 'Expired Date: ' + moment(row.user_end_date).format("YYYY-MM-DD"));
                });
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Register new user
bot.onText(/\/wg_add (.+) (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let srvName = match[3];

    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT * FROM wireguard WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                conn.query({
                    sql: "INSERT INTO wireguard (user_name, server_name, user_start_date, user_end_date) VALUES (?, ?, ?, ?)",
                    values: [userName, srvName, today, expired]
                }, (err, result) => {
                    if (err) throw err;
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## Wireguard register success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'Server Name: ' + srvName + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);
                });
            } else {
                bot.sendMessage(chatId, "Username exist");
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Renew user
bot.onText(/\/wg_renew (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT * FROM wireguard WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "User not exist");
            } else {
                // Get server name from last query
                let srvName = ''
                Object.keys(result).forEach((key) => {
                    let row = result[key];
                    srvName = row.server_name;
        
                });
                
                conn.query("UPDATE wireguard SET user_start_date = ?, user_end_date = ? WHERE user_name = ?", [today, expired, userName], (err, result) => {
                    if (err) throw err;
            
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## Wireguard renew success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'Server Name: ' + srvName + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
});

// Delete user
bot.onText(/\/wg_del (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("DELETE FROM wireguard WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, 'Wireguard User: ' + userName + ' removed!');
        });
    } catch (error) {
        console.log(error);
    }
});


// V2ray
// Get user info
bot.onText(/\/vr_info (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("SELECT * FROM v2ray WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "user not exist!");
            } else {
                Object.keys(result).forEach((key) => {
                    let row = result[key];
        
                    bot.sendMessage(chatId, '## V2ray user info ## \n'
                            + 'Username: ' + row.user_name + '\n'
                            + 'User UUID: ' + row.user_uuid + '\n'
                            + 'Server Name: ' + row.server_name + '\n'
                            + 'Protocol: ' + row.server_protocol + '\n'
                            + 'Start Date: ' + moment(row.user_start_date).format("YYYY-MM-DD") + '\n'
                            + 'Expired Date: ' + moment(row.user_end_date).format("YYYY-MM-DD"));
                });
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Get server status
bot.onText(/\/vr_stat/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    try {
        conn.query("SELECT server_name as Server, COUNT(user_id) AS Total FROM v2ray WHERE user_end_date > CURDATE() GROUP BY server_name", (err, result) => {
            if (err) throw err;

            jsonData = JSON.stringify(result)

            bot.sendMessage(chatId, jsonData)
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Register new user
bot.onText(/\/vr_add (.+) (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let srvName = match[3];
    let srvProto = 'vless'
    let userUuid = uuidv4();
    let link = process.env.VPNJE_API+`v2ray/${srvName}/${userUuid}`;

    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT * FROM v2ray WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                conn.query({
                    sql: "INSERT INTO v2ray (user_name, user_uuid, server_name, server_protocol, user_start_date, user_end_date) VALUES (?, ?, ?, ?, ?, ?)",
                    values: [userName, userUuid, srvName, srvProto, today, expired]
                }, (err, result) => {
                    if (err) throw err;
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## V2ray Register success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'User UUID: ' + userUuid + '\n'
                                + 'Server Name: ' + srvName + '\n'
                                + 'ID Type: ' + srvProto + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);

                    bot.sendMessage(chatId, link);
                });
            } else {
                bot.sendMessage(chatId, "Username exist");
            }
        });
    } catch (error) {
        console.log(error);
    }
});

// Generate api link
bot.onText(/\/vr_gen (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("SELECT user_uuid, server_name FROM v2ray WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "user not exist!");
            } else {
                Object.keys(result).forEach((key) => {
                    let row = result[key];

                    let link = process.env.VPNJE_API+`v2ray/${row.server_name}/${row.user_uuid}`;

                    bot.sendMessage(chatId, link);
                });
            }
        
        });
    } catch (error) {
        console.log(error);
    }

});


// Renew user
bot.onText(/\/vr_renew (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT * FROM v2ray WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "Username not exist");
            } else {
                let srvName = ''

                Object.keys(result).forEach((key) => {
                    let row = result[key];
                    srvName = row.server_name;
        
                });

                conn.query("UPDATE v2ray SET user_start_date = ?, user_end_date = ? WHERE user_name = ?", [today, expired, userName], (err, result) => {
                    if (err) throw err;
            
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## V2ray renew success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'Server Name: ' + srvName + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
});

// Delete user
bot.onText(/\/vr_del (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("DELETE FROM v2ray WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, 'User ' + userName + ' removed!');
        });
    } catch (error) {
        console.log(error);
    }
});


// Trojan
// Get user info
bot.onText(/\/tr_info (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("SELECT * FROM trojan WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "user not exist!");
            } else {
                Object.keys(result).forEach((key) => {
                    let row = result[key];
        
                    bot.sendMessage(chatId, '## Trojan user info ## \n'
                            + 'Username: ' + row.user_name + '\n'
                            + 'Server Name: ' + row.server_name + '\n'
                            + 'Start Date: ' + moment(row.user_start_date).format("YYYY-MM-DD") + '\n'
                            + 'Expired Date: ' + moment(row.user_end_date).format("YYYY-MM-DD"));
                });
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Register new user
bot.onText(/\/tr_add (.+) (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let srvName = match[3];

    let link = process.env.VPNJE_API+`trojan/${srvName}/${userName}`;
    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT * FROM trojan WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                conn.query({
                    sql: "INSERT INTO trojan (user_name, server_name, user_start_date, user_end_date) VALUES (?, ?, ?, ?)",
                    values: [userName, srvName, today, expired]
                }, (err, result) => {
                    if (err) throw err;
                    // console.log(result);

                    bot.sendMessage(chatId, '## Trojan registration success ## \n'
                    + 'Username: ' + userName + '\n'
                    + 'Server Name: ' + srvName + '\n'
                    + 'Start Date: ' + today + '\n'
                    + 'Expired Date: ' + expired + '\n'
                    + 'Support Group: ' + process.env.GROUP);

                    bot.sendMessage(chatId, link);
                });
            } else {
                bot.sendMessage(chatId, "Username exist");
            }
        
        });
    } catch (error) {
        console.log(error);
    }
});

// Generate api link
bot.onText(/\/tr_gen (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let srvName = match[2];
    let link = process.env.VPNJE_API+`trojan/${srvName}/${userName}`;

    bot.sendMessage(chatId, link);

});

// Renew user
bot.onText(/\/tr_renew (.+) (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];
    let day = match[2];
    let today = moment().format("YYYY-MM-DD");
    let expired = moment().add(day, 'days').format("YYYY-MM-DD");

    try {
        conn.query("SELECT * FROM trojan WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
    
            if (result.length === 0) {
                bot.sendMessage(chatId, "user not exist.");
            } else {
                // Get server name from last query
                let srvName = ''
                Object.keys(result).forEach((key) => {
                    let row = result[key];
                    srvName = row.server_name;
        
                });

                conn.query("UPDATE trojan SET user_start_date = ?, user_end_date = ? WHERE user_name = ?", [today, expired, userName], (err, result) => {
                    if (err) throw err;
            
                    // console.log(result);
                
                    bot.sendMessage(chatId, '## Trojan id renew success ## \n'
                                + 'Username: ' + userName + '\n'
                                + 'Server Name: ' + srvName + '\n'
                                + 'Start Date: ' + today + '\n'
                                + 'Expired Date: ' + expired + '\n'
                                + 'Support Group: ' + process.env.GROUP);
                });
            }
        });
    } catch (error) {
        console.log(error);
    }
});

// Delete user
bot.onText(/\/tr_del (.+)/, (msg, match) => {
    const chatId = process.env.ADMIN_GROUP;

    let userName = match[1];

    try {
        conn.query("DELETE FROM trojan WHERE user_name = ?", [userName], (err, result) => {
            if (err) throw err;
    
            // console.log(result);
        
            bot.sendMessage(chatId, `${userName} removed!`);
        });
    } catch (error) {
        console.log(error);
    }
});
