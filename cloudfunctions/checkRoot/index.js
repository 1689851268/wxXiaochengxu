// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

// 获取数据库引用
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
    let { phone } = event;
    return await db
        .collection("users")
        .where({
            phone,
            identity: _.neq("user"),
        })
        .get();
};
