// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
    let { invitationCode, oldState, newState } = event;
    /*  新增 user  /  更新已有 user 的进度  */
    let num = oldState == "all" ? 1 : -1;
    return await db
        .collection("users")
        .where({
            identity: "root",
            invitationCode,
        })
        .update({
            data: {
                orderInfo: {
                    [oldState]: _.inc(num),
                    [newState]: _.inc(1),
                },
            },
        });
};
