// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { limit, skip } = event;
    return await db
        .collection("users")
        .where({ identity: "root" })
        .skip(skip)
        .limit(limit)
        .field({
            name: 1,
            phone: 1,
            orderInfo: 1,
        })
        .get();
};
