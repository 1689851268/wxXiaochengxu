// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();
const _ = db.command;
const users = db.collection("users");

// 云函数入口函数
exports.main = async (event, context) => {
    let { orderScreenshotID, phone, rootPhone, oldState } = event;
    /* 如果是 "等待报销" 状态 */
    /* 则只需更新 users 的 orderScreenshotID 字段 */
    if (oldState == "repay") {
        return await users
            .where({ phone })
            .update({ data: { orderScreenshotID } });
    } /* 如果不是 "等待报销" 状态 */ else {
        /* 则需要修改 root 的 orderInfo 字段 */
        /* 以及 user 的 orderScreenshotID & state 字段 */
        return await users
            .where({ phone: rootPhone })
            /* 更新 root 的 orderInfo 数据 */
            .update({
                data: {
                    orderInfo: {
                        [oldState]: _.inc(-1),
                        repay: _.inc(1),
                    },
                },
            })
            .then(_ => {
                /* 更新 user 的 orderScreenshotID & state */
                return users.where({ phone }).update({
                    data: { orderScreenshotID, state: "repay" },
                });
            });
    }
};
