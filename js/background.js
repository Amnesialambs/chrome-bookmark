// bookmark.js functions
function clearBookmarks() {
    chrome.bookmarks.getTree((re) => {
        removeall(re);
        chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('img/icon.png'),
            title: '书签',
            message: '清空完毕'
        })
    })
}

function countBookmarks(callback) {
    chrome.bookmarks.getTree((re) => {
        var n = counted(re, 0);
        callback(n);
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

function removeall(data) {
    data[0].children.forEach((v) => {
        v.children.forEach((vv) => {
            if (vv.url === undefined) {
                chrome.bookmarks.removeTree(vv.id, function (rs) { })
            } else {
                chrome.bookmarks.remove(vv.id, function (rs) { })
            }
        })
    })
}

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
                    addAll(v.children, rs.id)
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

// Github class
function Github() {
  this.user = ''
  this.repos = ''
  this.token = ''
  this.key = ['username', 'repos', 'token']

  this.url = 'https://api.github.com'
  this.tags = 'tags'
  this.session = 'session'
  this.bookmarks = 'bookmarks'

  this.create = function (filepath) {
    var data = {
      'message': 'commit init',
      'content': 'eyJkZWZhdWx0IjpbeyJuYW1lIjoidGl0bGUiLCJ1cmwiOiJodHRwOi8vYmFpZHUuY29tIiwiaWNvbiI6IjEyMyIsInRpbWUiOiIyMDE5LTAxLTAxIn1dfQo='
    }

    chrome.storage.local.get(this.key, function (result) {
      this.url = 'https://api.github.com'
      this.user = result.username
      this.repos = result.repos
      this.token = result.token
      if (this.user === '' || this.user === undefined) {
        alert('未配置认证信息')
        return
      }

      fetch(this.url + '/repos/' + this.user + '/' + this.repos + '/contents/' + filepath, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': 'token ' + this.token
        })
      }).then(res => res.json())
        .catch((error) => {
          chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('img/icon.png'),
            title: '初始化' + filepath + '目录',
            message: error
          })
        })
        .then((response) => {
          console.log('初始化目录' + filepath + ' 成功')
        })
    })
  }

  this.getlist = function (filepath, element, elenum) {
    chrome.storage.local.get(this.key, function (result) {
      this.url = 'https://api.github.com'
      this.user = result.username
      this.repos = result.repos
      this.token = result.token
      if (this.user === '' || this.user === undefined) {
        return
      }

      fetch(this.url + '/repos/' + this.user + '/' + this.repos + '/contents/' + filepath, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': 'token ' + this.token
        })
      }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then((result) => {
          if (element && elenum) {
            result.forEach((vds) => {
              var op = document.createElement('option');
              op.setAttribute('label', vds['name']);
              op.setAttribute('value', vds['name']);
              op.setAttribute('select', 'select')
              element.appendChild(op);
            })
            elenum.innerText = result.length
          }
        })
    })
  }

  this.get = function (filepath) {
    chrome.bookmarks.getTree((re) => {
      removeall(re)

      chrome.storage.local.get(this.key, function (result) {
        this.url = 'https://api.github.com'
        this.user = result.username
        this.repos = result.repos
        this.token = result.token
        if (this.user === '' || this.user === undefined) {
          return
        }

        fetch(this.url + '/repos/' + this.user + '/' + this.repos + '/contents/' + filepath, {
          method: 'GET',
          headers: new Headers({
            'Content-Type': 'application/json',
            'Authorization': 'token ' + this.token
          })
        }).then(res => res.json())
          .catch(error => console.error('Error:', error))
          .then((result) => {
            let info = JSON.parse(decodeURIComponent(atob(result['content'])))

            try {
              addAll(info[0].children, '')
            } catch (e) {
            } finally {
              chrome.notifications.create(null, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('img/icon.png'),
                title: '更新本地书签',
                message: '同步完成 '
              })
            }
          })
      })
    })
  }

  this.updateTags = function (filepath, message) {
    let _this = this
    chrome.storage.local.get(this.key, function (result) {
      let _this2 = this
      this.url = 'https://api.github.com'
      this.user = result.username
      this.repos = result.repos
      this.token = result.token
      if (this.user === '' || this.user === undefined) {
        return
      }

      var urls = this.url + '/repos/' + this.user + '/' + this.repos + '/contents/' + filepath

      chrome.bookmarks.getTree((re) => {
        var content = btoa(encodeURIComponent(JSON.stringify(re)))
        
        var data = {
          'message': '全量同步bookmarks ' + message,
          'content': content
        }

        // 先尝试获取文件信息（为了 sha）
        fetch(urls, {
          method: 'GET',
          headers: {
            'Authorization': 'token ' + _this2.token
          }
        }).then(res => {
          if (res.ok) {
            return res.json().then(fileInfo => {
              data.sha = fileInfo.sha
              return fetch(urls, {
                method: 'PUT',
                body: JSON.stringify(data),
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'token ' + _this2.token
                }
              })
            })
          } else if (res.status === 404) {
            // 文件不存在，直接创建
            return fetch(urls, {
              method: 'PUT',
              body: JSON.stringify(data),
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token ' + _this2.token
              }
            })
          } else {
            throw new Error('GitHub API error: ' + res.status)
          }
        })
        .then(res => res.json())
        .then(response => {
          if (response && response.content) {
            chrome.notifications.create(null, {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('img/icon.png'),
              title: '上传全量书签',
              message: '成功'
            })
          } else if (response && response.message) {
            chrome.notifications.create(null, {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('img/icon.png'),
              title: '上传全量书签错误',
              message: response.message
            })
          }
        })
        .catch((error) => {
          chrome.notifications.create(null, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('img/icon.png'),
            title: '上传全量书签错误',
            message: error.message || '未知错误'
          })
        })
      })
    })
  }

  this.delete = function (filepath, message) {
    chrome.storage.local.get(this.key, function (result) {
      this.url = 'https://api.github.com'
      this.user = result.username
      this.repos = result.repos
      this.token = result.token
      if (this.user === '' || this.user === undefined) {
        return
      }

      var urls = this.url + '/repos/' + this.user + '/' + this.repos + '/contents/' + filepath

      fetch(urls, {
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json',
          'Authorization': 'token ' + this.token
        })
      }).then(res => res.json())
        .catch(error => console.error('Error:', error))
        .then((result) => {
          var data = {
            'message': message,
            'branch': 'master',
            'sha': result['sha']
          }

          fetch(urls, {
            method: 'DELETE',
            body: JSON.stringify(data),
            headers: new Headers({
              'Content-Type': 'application/json',
              'Authorization': 'token ' + this.token
            })
          }).then(res => res.json())
            .catch(error => console.error('Error:', error))
            .then((response) => {
              chrome.notifications.create(null, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('img/icon.png'),
                title: '书签删除',
                message: '远程书签 ' + filepath + ' 删除完毕！'
              })
            })
        })
    })
  }
}

// omnibox
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    if (!text) return;
    var result = []
    chrome.bookmarks.search(text, function (re) {
        re.forEach((data, index) => {
            if (data.url !== undefined) {
                result[index] = { content: data.url, description: data.title }
            }
        })
        suggest(result)
    })
});

chrome.omnibox.onInputEntered.addListener((text) => {
    if (!text) return;
    openUrlCurrentTab(text);
});

function getCurrentTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (callback) callback(tabs.length ? tabs[0].id : null);
    });
}

function openUrlCurrentTab(url) {
    getCurrentTabId(tabId => {
        chrome.tabs.update(tabId, { url: url });
    })
}

// Message handler for popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const github = new Github();
    
    switch (request.action) {
        case 'commit':
            github.create('bookmarks/create');
            sendResponse({ success: true });
            break;
        case 'clear':
            clearBookmarks();
            sendResponse({ success: true });
            break;
        case 'delete':
            github.delete('bookmarks/' + request.filename, '删除' + request.filename);
            sendResponse({ success: true });
            break;
        case 'upload':
            github.updateTags('bookmarks/' + request.filename, request.message);
            sendResponse({ success: true });
            break;
        case 'download':
            github.get('bookmarks/' + request.filename);
            sendResponse({ success: true });
            break;
        case 'getlist':
            github.getlist('bookmarks/', null, null);
            sendResponse({ success: true });
            break;
        case 'countBookmarks':
            countBookmarks(function(n) {
                sendResponse({ success: true, count: n });
            });
            break;
        case 'getBackupList':
            chrome.storage.local.get(['username', 'repos', 'token'], function(result) {
                if (result.username && result.repos && result.token) {
                    fetch('https://api.github.com/repos/' + result.username + '/' + result.repos + '/contents/bookmarks/', {
                        method: 'GET',
                        headers: {
                            'Authorization': 'token ' + result.token
                        }
                    }).then(res => {
                        if (!res.ok) {
                            return res.json().then(err => {
                                throw new Error(err.message || 'API error: ' + res.status);
                            });
                        }
                        return res.json();
                    })
                        .then(data => {
                            sendResponse({ success: true, list: Array.isArray(data) ? data : [] });
                        })
                        .catch(err => {
                            sendResponse({ success: false, error: err.message });
                        });
                } else {
                    sendResponse({ success: false, error: '未配置认证信息' });
                }
            });
            break;
    }
    return true;
});
