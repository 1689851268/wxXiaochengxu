// pages/setPermission/setPermission.js
Page({
    data: {
        /* 管理员填写的数据 */
        userPhone: "",
        rootPhone: "",
        sms: "",
        /* 验证码 */
        smsTime: "", // 获取验证码的 cd
        smsTimer: "", // 验证码的计时器
        /* 辅助数据 */
        realSms: "",
        userPhoneOk: false,
        rootPhoneOk: false,
        smsOk: false,
        /* 遮罩层 */
        show: false,
    },

    // 检查 superRoot 填写的手机号码
    checkPhone(e) {
        let identity = e.currentTarget.dataset.identity;
        if (/^1[3|4|5|7|8][0-9]\d{8}$/.test(e.detail))
            this.setData({ [`${identity}phoneOk`]: true });
        else this.setData({ [`${identity}phoneOk`]: false });
    },

    // 检查 superRoot 填写的验证码
    checkSms(e) {
        if (e.detail.length == 6) this.setData({ smsOk: true });
        else this.setData({ smsOk: false });
    },

    // 获取验证码
    getSms() {
        wx.showLoading({ mask: true });
        /* 调用云函数、遍历数据库 */
        wx.cloud
            .callFunction({
                name: "checkRoot",
                data: { phone: this.data.rootPhone },
            })
            /* 检查是否为管理员 */
            .then(res => {
                let data = res.result.data;
                if (data.length) {
                    this.setData({ identity: data[0].identity });
                    return "ok";
                }
                return Promise.reject("no Permission");
            })
            /* 获取验证码并保存起来 */
            .then(_ => {
                wx.request({
                    url: "https://www.onlyid.net/api/open/send-otp",
                    method: "POST",
                    header: { "content-type": "application/json" },
                    data: {
                        recipient: this.data.phone,
                        clientId: "55a858cc9db2491ead2a3f23e7cb0681",
                        clientSecret: "458645a3b4c243248572cd658be97b18",
                    },
                    success: res => {
                        if (res.statusCode == 200) {
                            this.setData({ realSms: res.data.code });
                            /* 验证码 5 分钟后失效 */
                            setTimeout(() => {
                                this.setData({ realSms: "" });
                            }, 5 * 60 * 1000);
                            wx.hideLoading();
                        } else {
                            wx.showToast({
                                title: "验证码获取失败",
                                icon: "error",
                            });
                            console.log("验证码获取失败 - ", res);
                        }
                    },
                    fail: err => {
                        wx.showToast({
                            title: "验证码获取失败",
                            icon: "error",
                        });
                        console.log("验证码获取失败 - ", err);
                    },
                    /* 读秒，指定时间内只能获取一次验证码 */
                    complete: _ => {
                        this.setData({ smsTime: 60 });
                        this.data.smsTimer = setInterval(() => {
                            this.setData({ smsTime: --this.data.smsTime });
                            if (this.data.smsTime <= 0) {
                                clearInterval(this.data.smsTimer);
                                this.setData({ smsTime: 0 });
                            }
                        }, 1000);
                    },
                });
            })
            /* 处理错误 */
            .catch(err => {
                if (err == "no Permission")
                    wx.showToast({ title: "您不是管理员", icon: "error" });
                else {
                    wx.showToast({ title: "数据获取失败", icon: "error" });
                    console.log("数据获取失败 - ", err);
                }
            });
    },

    // 关闭遮罩层
    onClose() {
        this.setData({ show: false });
    },

    // 设置权限
    setPermission(e) {
        let { realSms, sms } = this.data;
        /* 检查验证码是否正确 */
        if (realSms == sms) {
            wx.showLoading({ title: "设置中...", mask: true });
            /* 1. user → root / root → user */
            let targetIdentity = e.currentTarget.dataset.identity;
            /* 2. 遍历数据库 */
            let { userPhone: phone } = this.data;
            wx.cloud
                .callFunction({ name: "getPerson", data: { phone } })
                .then(res => {
                    /* 2.1 数据库没有此人 */
                    if (res.result.data.length == 0) {
                        if (targetIdentity == "root") {
                            /* 2.1.1 数据库没有此人 & 设置 root → 是否新增管理员 */
                            return Promise.reject("myError-没有该用户");
                        } else {
                            /* 2.1.2 数据库没有此人 & 设置 user → 提示检查信息 */
                            return Promise.reject("myError-没有该管理员");
                        }
                    } /* 2.2 数据库有此人 */ else {
                        let {
                            identity: oldIdentity,
                            invitationCode,
                            invitedYard,
                        } = res.result.data[0];
                        /* 2.2.1 要修改的状态与原状态一样 → 提示信息 */
                        if (targetIdentity == oldIdentity) {
                            let tip =
                                targetIdentity == "root"
                                    ? "管理员"
                                    : "普通用户";
                            return Promise.reject(`myError-已是${tip}`);
                        } /* 2.2.2 要修改的状态与原状态不一样 → 修改状态 */ else {
                            /* 2.2.2.1 此人为 user & 设置 root → 修改为 root */
                            /* 2.2.2.2 此人为 root & 设置 user → 修改为 user */
                            return wx.cloud.callFunction({
                                name: "changePermission",
                                data: {
                                    identity: targetIdentity,
                                    phone,
                                    invitationCode,
                                    invitedYard,
                                },
                            });
                        }
                    }
                })
                .then(_ => {
                    /* 重置数据 */
                    this.setData({
                        /* 管理员填写的数据 */
                        userPhone: "",
                        rootPhone: "",
                        sms: "",
                        /* 辅助数据 */
                        realSms: "",
                        userPhoneOk: false,
                        rootPhoneOk: false,
                        smsOk: false,
                        /* 遮罩层 */
                        show: false,
                    });
                    wx.navigateBack({ delta: 1 }); // 返回上一页
                    wx.showToast({ title: "更新成功" });
                })
                .catch(err => {
                    if (err.split("-")[0] == "myError") {
                        if (err.split("-")[1] == "没有该用户") {
                            wx.hideLoading();
                            this.setData({ show: true });
                        } else {
                            wx.showToast({
                                title: err.split("-")[1],
                                icon: "error",
                            });
                        }
                    } else {
                        wx.showToast({ title: "更新失败", icon: "error" });
                        console.log("更新失败 - ", err);
                    }
                });
        } else {
            wx.showToast({
                title: "验证码错误",
                icon: "error",
            });
        }
    },

    // 添加新 root
    addNewRoot() {
        let { userPhone, rootPhone, sms, smsTime } = this.data;
        wx.navigateTo({
            url: `../addRoot/addRoot?rootPhone=${userPhone}&superRootPhone=${rootPhone}&sms=${sms}&smsTime=${
                smsTime + 2
            }`,
        });
    },
});
