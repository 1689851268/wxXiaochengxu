Page({
    data: {
        /* 控制下拉菜单 */
        order: [
            { text: "全部订单", value: "all" },
            { text: "1.0 待审批", value: "waiting" },
            { text: "1.1 未过审", value: "flunk" },
            { text: "1.2 已过审", value: "pass" },
            { text: "2.0 等待报销", value: "repay" },
            { text: "2.1 报销失败", value: "repay_fail" },
            { text: "2.2 报销成功", value: "repay_success" },
        ],
        orderVal: "all",
        sort: [
            { text: "按时间降序", value: "desc" },
            { text: "按时间升序", value: "asc" },
            { text: "选择指定时间", value: "select" },
        ],
        sortVal: "desc",
        /* 控制遮罩层 */
        orderScreenshot: [],
        index: -1, // 打开遮罩层的下标
        /* 管理员信息 */
        phone: "",
        invitationCode: "",
        total: 0, // 获取到的总人数
        /* 控制页数 */
        pageNum: 1, // 总页数
        curPage: 1, // 当前页
        showNumInOnePage: 10, // 一页展示的数量
        userList: [], // 展示的用户
        /* 日历 */
        date: "",
        calendar: false,
    },

    // 打开日历
    openCalendar() {
        this.setData({ calendar: true });
    },
    // 关闭日历
    closeCalendar() {
        this.setData({ calendar: false });
    },
    // 格式化日历数据
    formatDate(date) {
        date = new Date(date);
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    },
    // 提交日历信息
    onConfirm(event) {
        let [start, end] = event.detail;
        this.setData({
            calendar: false,
            date: `${this.formatDate(start)} - ${this.formatDate(end)}`,
        });
        end = end.getTime() + 1000 * 60 * 60 * 24;
        this.getUsers([start.getTime(), end]);
    },

    /* 拉起遮罩层 */
    onClickShow(e) {
        this.setData({
            index: e.target.dataset.index,
            [`userList[${e.target.dataset.index}].showMask`]: true,
        });
    },

    /* 关闭遮罩层 */
    onClickHide() {
        this.setData({
            [`userList[${this.data.index}].showMask`]: false,
        });
        setTimeout(() => {
            this.setData({ orderScreenshot: [] });
        }, 500);
    },

    // 展示上传的截图
    afterRead(e) {
        const url = e.detail.file.url;
        const { orderScreenshot = [] } = this.data;
        orderScreenshot.push({ url });
        this.setData({ orderScreenshot });
    },

    // 删除选中的图片
    deleteImg() {
        this.setData({ orderScreenshot: [] });
    },

    // 点击 [提交] 上传截图
    submitPic(e) {
        wx.showLoading({ title: "上传中...", mask: true });
        let [phone, oldState] = e.currentTarget.dataset.strinfo.split("-");
        let rootUrl = this.data.invitationCode;
        wx.cloud
            /* 上传图片 */
            .uploadFile({
                cloudPath: `${rootUrl}/${phone}-order.png`,
                filePath: this.data.orderScreenshot[0].url,
            })
            /* 更新数据库的数据 */
            .then(res => {
                return wx.cloud.callFunction({
                    name: "updateProgress",
                    data: {
                        phone, // 用户手机
                        rootPhone: this.data.phone, // 管理员手机
                        oldState, // 用户的原状态
                        orderScreenshotID: res.fileID, // 截图地址
                    },
                });
            })
            /* 更新页面的数据 */
            .then(_ => {
                /* 如果不是 "等待报销" 状态 */
                if (oldState !== "repay") {
                    /* 修改状态、关闭遮罩层、清空截图暂存 */
                    this.setData({
                        userList: this.data.userList.map(item => {
                            if (item.phone == phone) {
                                item.state = "repay";
                                item.showMask = false;
                            }
                            return item;
                        }),
                        orderScreenshot: [],
                    });
                } /* 如果是 "等待报销" 状态 */ else {
                    this.setData({
                        /* 只需关闭遮罩层、清空截图暂存 */
                        userList: this.data.userList.map(item => {
                            if (item.phone == phone) item.showMask = false;
                            return item;
                        }),
                        orderScreenshot: [],
                    });
                }
                wx.showToast({ title: "数据更新成功" });
            })
            /* 错误处理 */
            .catch(err => {
                wx.showToast({ title: "数据更新失败", icon: "error" });
                console.log("数据更新失败 - ", err);
            });
    },

    /* 切换订单 */
    changeOrder(e) {
        this.setData({ orderVal: e.detail, sortVal: "asc" });
        this.getUsers();
    },

    /* 切换排序 */
    changeSort(e) {
        this.setData({ sortVal: e.detail });
        if (e.detail == "select") {
            this.openCalendar();
            /* 1. 弹出时间选择器 */
            /* 2. 选择开始、结束时间 */
            /* 3. 从数据库获取数据 */
        } else {
            this.getUsers();
        }
    },

    // 重新选择时间
    selectTime(e) {
        if (this.data.sortVal == "select") {
            this.openCalendar();
        }
    },

    /* 获取用户信息 */
    getUsers(timeArr = []) {
        wx.showLoading({ title: "加载中...", mask: true });
        wx.cloud
            /* 通过电话号码获取邀请码、用户量 */
            .callFunction({
                name: "getInviteCodeAndOrderNum",
                data: { phone: this.data.phone },
            })
            /* 根据 orderVal & sortVal 控制页面展示 */
            .then(res => {
                /* 更新分页器、暂存邀请码 */
                let resInfo = res.result.data[0];
                let {
                    showNumInOnePage,
                    curPage,
                    orderVal,
                    sortVal,
                } = this.data;
                this.setData({
                    total: resInfo.orderInfo[orderVal], // 信息总数
                    pageNum: Math.ceil(
                        resInfo.orderInfo[orderVal] / showNumInOnePage
                    ), // 总页数
                    invitationCode: resInfo.invitationCode, // 邀请码
                });
                /* 获取指定状态的用户列表 */
                return wx.cloud.callFunction({
                    name: "getUsers",
                    data: {
                        timeArr, // 时间段
                        invitationCode: resInfo.invitationCode, // 邀请码
                        state: orderVal, // 状态
                        sort: sortVal, // 时间排序
                        limit: showNumInOnePage, // 每页展示的信息量
                        skip: (curPage - 1) * showNumInOnePage, // 第几页
                    },
                });
            })
            /* 更新展示的用户数组 */
            .then(res => {
                this.setData({
                    userList: res.result.data.map(item => {
                        item.showMask = false;
                        return item;
                    }),
                });
                wx.hideLoading();
            })
            /* 错误处理 */
            .catch(err => {
                wx.hideLoading();
                wx.showToast({
                    title: "数据获取失败",
                    icon: "error",
                });
                console.log("用户数据获取失败 - ", err);
            });
    },

    /* 控制页数 */
    changePage(e) {
        let control = e.detail.cur;
        switch (control) {
            case "up":
                this.setData({ curPage: this.data.curPage - 1 });
                break;
            case "down":
                this.setData({ curPage: this.data.curPage + 1 });
                break;
            case "1":
                this.setData({ curPage: 1 });
                break;
            case this.data.pageNum:
                this.setData({ curPage: this.data.pageNum });
                break;
        }
        this.getUsers();
    },

    /* 获取管理员信息（手机号码、用户） */
    onLoad(options) {
        this.setData({ phone: options.phone });
        /* 获取该 root 拉取的所有用户 */
        this.getUsers();
    },
});
/* 
	{
		"applyDate": 1651042118649,
		"identity": "user",
		"name": "HZP",
		"phone": "13160968549",
		"invitationCode": "1A2B3C",
		"screenshotID": "cloud://cloud1-2gigdheo4aa59fdc.636c-cloud1-2gigdheo4aa59fdc-1309717558/1A2B3C/HZP-13160968549.png",
		"state": "waiting"
	}
*/
