// pages/addRoot/addRoot.js
Page({
    data: {
        /* 填写的数据 */
        rootName: "",
        rootPhone: "",
        superRootPhone: "",
        /* 验证码 */
        realSms: "",
        sms: "",
        smsTime: 0, // 获取验证码的 cd
        smsTimer: 0, // 验证码计时器
        /* 辅助数据 */
        smsOk: false,
        rootPhoneOk: false,
        superRootPhoneOk: false,
        myDelta: 1,
        /* 获取的数据 */
        invitationCode: "",
    },

    // 检查用户输入的姓名
    checkName(e) {
        let rootName = e.detail.trim();
        if (rootName) this.setData({ rootName });
        else this.setData({ rootName: "" });
    },

    // 检查用户输入的手机号码
    checkPhone(e) {
        let identity = e.currentTarget.dataset.identity;
        if (/^1[3|4|5|7|8][0-9]\d{8}$/.test(e.detail))
            this.setData({ [`${identity}PhoneOk`]: true });
        else this.setData({ [`${identity}PhoneOk`]: false });
    },

    // 验证用户输入的短信验证码
    checkSms(e) {
        if (e.detail.length == 6) this.setData({ smsOk: true });
        else this.setData({ smsOk: false });
    },

    // 获取验证码
    getSms() {
        wx.showLoading();
        /* 调用云函数、遍历数据库 */
        wx.cloud
            .callFunction({
                name: "checkRoot",
                data: { phone: this.data.phone },
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
                        recipient: this.data.superRootPhone,
                        clientId: "55a858cc9db2491ead2a3f23e7cb0681",
                        clientSecret: "bc4c687efeb24adf97731902b44c9f5b",
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

    // 添加管理员
    addRoot() {
        let { realSms, sms } = this.data;
        if (realSms == sms) {
            wx.showLoading({ title: "更新中...", mask: true });
            let { rootName: name, rootPhone: phone } = this.data;
            wx.cloud
                .callFunction({ name: "checkUser", data: { phone } })
                .then(res => {
                    console.log("res", res);
                    if (res.result.data.length == 0) {
                        return wx.cloud.callFunction({
                            name: "addRoot",
                            data: { name, phone },
                        });
                    } else {
                        return Promise.reject("该用户已存在");
                    }
                })
                .then(res => {
                    let invitationCode = res.result.data.invitationCode;
                    this.setData({ invitationCode });
                    wx.hideLoading();
                })
                .catch(err => {
                    if (err == "该用户已存在") {
                        wx.showToast({
                            title: "该用户已存在",
                            icon: "error",
                        });
                    } else {
                        wx.showToast({
                            title: "添加失败",
                            icon: "error",
                        });
                        console.log("添加失败 - ", err);
                    }
                });
        } else {
            wx.showToast({
                title: "验证码错误",
                icon: "error",
            });
        }
    },

    // 点击返回
    jumpBack() {
        wx.navigateBack({ delta: this.data.myDelta });
    },

    // 页面加载时触发
    onLoad(options) {
        let { rootPhone, superRootPhone, sms, smsTime } = options;
        if (rootPhone) {
            this.setData({
                rootPhone,
                superRootPhone,
                sms,
                realSms: sms,
                smsTime, // 获取验证码的 cd
                smsOk: true,
                rootPhoneOk: true,
                superRootPhoneOk: true,
                myDelta: 2,
            });
            this.data.smsTimer = setInterval(() => {
                this.setData({ smsTime: --this.data.smsTime });
                if (this.data.smsTime <= 0) {
                    clearInterval(this.data.smsTimer);
                    this.setData({ smsTime: 0 });
                }
            }, 1000);
        }
    },
});
