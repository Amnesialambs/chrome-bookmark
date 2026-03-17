// 备份书签数据到本地存储并导出到文件
function backupBookmarks(callback) {
    chrome.bookmarks.getTree((tree) => {
        const data = tree
        chrome.storage.local.get({ bookmarksBackups: [] }, (store) => {
            const backups = store.bookmarksBackups || []
            const ts = Date.now()
            const entry = { id: ts.toString(), ts: ts, data: data }
            backups.push(entry)
            chrome.storage.local.set({ bookmarksBackups: backups }, () => {
                // 尝试导出到本地文件，方便在插件目录以外也可备份
                exportBackupToFile(entry)
                if (typeof callback === 'function') callback()
            })
        })
    })
}

// 将备份导出为本地下载的 json 文件
function exportBackupToFile(entry) {
    try {
        const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const dt = new Date(entry.ts)
        const pad = (n) => (n < 10 ? '0' + n : '' + n)
        const filename = `bookmarks-backup-${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}-${pad(dt.getHours())}${pad(dt.getMinutes())}${pad(dt.getSeconds())}.json`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
    } catch (e) {
        console.error('Backup export failed', e)
    }
}

// 还原最近一次备份
function restoreBookmarks(backupId) {
    chrome.storage.local.get({ bookmarksBackups: [] }, (store) => {
        const backups = store.bookmarksBackups || []
        let targetBackup
        if (backupId) {
            targetBackup = backups.find(b => b.id === backupId)
        } else {
            targetBackup = backups[backups.length - 1]
        }
        
        if (!targetBackup) {
            chrome.notifications.create(null, {
                type: 'basic',
                iconUrl: 'img/icon.png',
                title: '书签',
                message: '无可用备份进行恢复'
            })
            return
        }
        chrome.bookmarks.getTree((re) => {
            removeall(re, function () {
                setTimeout(function () {
                    chrome.bookmarks.create({ parentId: '0', title: '恢复的书签' }, function (newFolder) {
                        if (newFolder && newFolder.id) {
                            addAllRestore(targetBackup.data, newFolder.id)
                        } else {
                            chrome.bookmarks.create({ parentId: '2', title: '恢复的书签' }, function (newFolder2) {
                                if (newFolder2 && newFolder2.id) {
                                    addAllRestore(targetBackup.data, newFolder2.id)
                                }
                            })
                        }
                        chrome.notifications.create(null, {
                            type: 'basic',
                            iconUrl: 'img/icon.png',
                            title: '书签',
                            message: '本地书签已从备份恢复'
                        })
                    })
                }, 500)
            })
        })
    })
}

function addAllRestore(data, parentname) {
    if (!data || !Array.isArray(data)) return
    
    const root = data[0]
    if (root && root.children) {
        root.children.forEach((folder) => {
            if (folder.children && folder.children.length > 0) {
                chrome.bookmarks.create({ parentId: parentname, title: folder.title }, function (rs) {
                    if (rs && rs.id) {
                        folder.children.forEach((item) => {
                            restoreItem(item, rs.id)
                        })
                    }
                })
            } else if (folder.url) {
                chrome.bookmarks.create({ parentId: parentname, title: folder.title, url: folder.url })
            }
        })
    }
}

function restoreItem(item, parentId) {
    if (item.children && item.children.length > 0) {
        chrome.bookmarks.create({ parentId: parentId, title: item.title }, function (rs) {
            if (rs && rs.id) {
                item.children.forEach((child) => {
                    restoreItem(child, rs.id)
                })
            }
        })
    } else if (item.url) {
        chrome.bookmarks.create({ parentId: parentId, title: item.title, url: item.url })
    }
}

// 清空标签
function clearBookmarks() {
    backupBookmarks(() => {
        chrome.bookmarks.getTree((re) => {
            removeall(re, function () {
                chrome.notifications.create(null, {
                    type: 'basic',
                    iconUrl: 'img/icon.png',
                    title: '书签',
                    message: '清空完毕'
                })
            })
        })
    })
}

// 统计书签个数
function countBookmarks(element) {
    chrome.bookmarks.getTree((re) => {
        var n = counted(re, 0);
        element.innerText = n
    })
}

function counted(data, num) {
    data.forEach((v) => {
        if (v.url === undefined) {
            num = counted(v.children, num)
        } else {
            num += 1
        }
    })
    return num
}

// 清空三级目录或书签信息（异步）
function removeall(data, callback) {
    const nodes = []
    data[0].children.forEach((v) => {
        v.children.forEach((vv) => {
            nodes.push(vv)
        })
    })
    
    let pending = nodes.length
    if (pending === 0) {
        if (typeof callback === 'function') callback()
        return
    }
    
    nodes.forEach((vv) => {
        if (vv.url === undefined) {
            chrome.bookmarks.removeTree(vv.id, function () {
                pending--
                if (pending === 0 && typeof callback === 'function') callback()
            })
        } else {
            chrome.bookmarks.remove(vv.id, function () {
                pending--
                if (pending === 0 && typeof callback === 'function') callback()
            })
        }
    })
}

// 递归全量导入
// bookmark ( object )
// parentId ( optional string )
// Defaults to the Other Bookmarks folder.
// index ( optional integer )
// title ( optional string )
// url ( optional string )
function addAll(data, parentname) {
    data.forEach((v) => {
        if (parentname === '') {
            if (v.children !== undefined) {
                addAll(v.children, v.id)
            } else {
                var tmp = {
                    parentId: v.id,
                    title: v.title,
                    url: v.url
                }
                chrome.bookmarks.create(tmp, function (rrs) { })
            }
        } else {
            if (v.children !== undefined) {
                var tmp = {
                    parentId: parentname,
                    title: v.title
                }
                chrome.bookmarks.create(tmp, function (rs) {
                    if (rs && rs.id) {
                        addAll(v.children, rs.id)
                    }
                })
            } else {
                var tmp = {
                    parentId: parentname,
                    title: v.title,
                    url: v.url
                }
                chrome.bookmarks.create(tmp, function (rrs) { })
            }
        }
    })
}
