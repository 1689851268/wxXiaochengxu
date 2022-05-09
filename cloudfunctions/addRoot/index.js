// 云函数入口文件
const cloud = require("wx-server-sdk");
cloud.init();

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
    let { name, phone } = event;

    // 创建邀请码
    function createInvitationCode() {
        let bool = "1234567890QWERTYUIOPASDFGHJKLZXCVBNM";
        let res = [];
        while (res.length !== 6) {
            let index = Math.floor(Math.random() * bool.length);
            res[res.length] = bool[index];
        }
        return res.join("");
    }

    return await db
        .collection("users")
        .add({
            data: {
                name,
                phone,
                identity: "root",
                invitationCode: createInvitationCode(),
                orderInfo: {
                    all: 0,
                    waiting: 0,
                    flunk: 0,
                    pass: 0,
                    repay: 0,
                    repay_fail: 0,
                    repay_success: 0,
                },
            },
        })
        .then(res => {
            let id = res._id;
            return db.collection("users").doc(id).get();
        });
};
