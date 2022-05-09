// pages/superRootManage/superRootManage.js
Page({
    data: {
        rootList: [], // 展示的 root
        showNumInOnePage: 3, // 每页展示的数量
        curPage: 1, // 当前页
        pageNum: 1, // 总页数
        total: 1, // root 总数
    },

    /* 获取管理员数据、更新分页器数据 */
    getRoots() {
        wx.showLoading({ title: "加载中..." });
        let { curPage, showNumInOnePage } = this.data;
        wx.cloud
            /* 获取一页数据 */
            .callFunction({
                name: "getRoots",
                data: {
                    limit: showNumInOnePage, // 每页展示的信息量
                    skip: (curPage - 1) * showNumInOnePage, // 第几页
                },
            })
            /* 更新页面数据 */
            .then(res => {
                let rootList = res.result.data;
                this.setData({ rootList });
                wx.hideLoading();
            })
            /* 错误处理 */
            .catch(err => {
                wx.hideLoading();
                wx.showToast({ title: "数据获取失败", icon: "error" });
                console.log("数据获取失败 - ", err);
            });
    },

    /* 换页 */
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
        this.getRoots();
    },

    /* 跳转到指定 manageRoot 页面 */
    goRootPage(e) {
        let phone = e.currentTarget.dataset.phone;
        wx.navigateTo({
            url: `../manageRoot/manageRoot?phone=${phone}`,
        });
    },

    /* 页面加载时触发 */
    onShow() {
        wx.showLoading({ title: "加载中..." });
        /* 获取数据总数 */
        wx.cloud
            .callFunction({ name: "getRootsNum" })
            .then(res => {
                let total = res.result.total,
                    pageNum = Math.ceil(total / this.data.showNumInOnePage);
                this.setData({ total, pageNum });
                wx.hideLoading();
            })
            .catch(err => {
                wx.hideLoading();
                wx.showToast({ title: "数据获取失败", icon: "error" });
                console.log("err", err);
            });
        /* 获取(部分)数据 */
        this.getRoots();
    },
});
