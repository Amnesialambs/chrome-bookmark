function getDate() {
  let myDate = new Date()
  let year = myDate.getFullYear()
  let month = myDate.getMonth() + 1
  let date = myDate.getDate()
  let h = myDate.getHours()
  let m = myDate.getMinutes()
  let s = myDate.getSeconds()
  let now = year + '-' + conver(month) + '-' + conver(date) + ' ' + conver(h) + ':' + conver(m) + ':' + conver(s)
  return now
}

function conver(s) {
  return s < 10 ? '0' + s : s
}

let $ = (selector) => {
  return document.querySelector(selector)
}

document.getElementById('commit').onclick = function () {
  let https = document.getElementById('repos').value
  let tmp = https.split('/')
  let username = tmp[tmp.length - 2]
  let repos = tmp[tmp.length - 1]
  let token = document.getElementById('token').value

  chrome.storage.local.set({ 'username': username, 'repos': repos, 'token': token }, () => {
    chrome.runtime.sendMessage({ action: 'commit' }, (response) => {
      chrome.notifications.create(null, {
        type: 'basic',
        iconUrl: 'img/icon.png',
        title: '保存配置',
        message: '认证配置成功'
      })
    })
  })
}

document.getElementById('clear').onclick = function () {
  chrome.runtime.sendMessage({ action: 'clear' }, (response) => {})
}

document.getElementById('clearonline').onclick = function () {
  let files = document.getElementById('filename').value
  if (files !== '' && files !== undefined) {
    chrome.runtime.sendMessage({ action: 'delete', filename: files }, (response) => {
      $('#message-success').innerText = '远程删除成功'
      clearAndFadeMessage($('#message-success'))
    })
  } else {
    $('#message-error').innerText = '未选定文件名'
    clearAndFadeMessage($('#message-error'))
  }
}

document.getElementById('upload').onclick = function () {
  let files = document.getElementById('filename').value
  if (files !== '' && files !== undefined) {
    chrome.runtime.sendMessage({ action: 'upload', filename: files, message: getDate() }, (response) => {
      $('#message-success').innerText = '同步上传成功'
      clearAndFadeMessage($('#message-success'))
    })
  } else {
    $('#message-error').innerText = '未选定文件名'
    clearAndFadeMessage($('#message-error'))
  }
}

document.getElementById('download').onclick = function () {
  let files = document.getElementById('filename').value
  if (files !== '' && files !== undefined) {
    chrome.runtime.sendMessage({ action: 'download', filename: files }, (response) => {
      $('#message-success').innerText = '更新下载成功'
      clearAndFadeMessage($('#message-success'))
    })
  } else {
    $('#message-error').innerText = '未选定文件名'
    clearAndFadeMessage($('#message-error'))
  }
}

document.getElementById('toggle').onclick = function () {
  toggleSettings()
}

function toggleSettings() {
  let main = $('#main')
  let setting = $('#setting')
  if (main.style.display === 'block') {
    setting.style.display = 'block'
    main.style.display = 'none'
  } else {
    setting.style.display = 'none'
    main.style.display = 'block'
  }
}

function switch2Main() {
  let main = $('#main')
  let setting = $('#setting')
  setting.style.display = 'none'
  main.style.display = 'block'
}

function switch2Setting() {
  let main = $('#main')
  let setting = $('#setting')
  setting.style.display = 'block'
  main.style.display = 'none'
}

function clearAndFadeMessage(element, time = 3000) {
  setTimeout(() => {
    element && (element.innerText = '')
  }, time)
}

window.onload = function () {
  let key = ['username', 'repos', 'token', 'localnum']
  let username;
  let repos;
  let token;
  let localnum;

  chrome.storage.local.get(key, function (result) {
    username = result.username;
    repos = result.repos;
    token = result.token;
    localnum = result.localnum;

    if (localnum === '' || localnum === undefined) {
      chrome.runtime.sendMessage({ action: 'countBookmarks' }, (response) => {
        if (response && response.count !== undefined) {
          $('#count-local').innerText = response.count
        }
      })
    }

    if (token === '' || token === undefined) {
      $('#message-error').innerText = '未配置认证信息'
      clearAndFadeMessage($('#message-error'))
    } else {
      $('#repos').value = 'https://github.com/' + username + '/' + repos
      $('#token').value = token
      switch2Main()
      
      // 获取远程备份列表
      chrome.runtime.sendMessage({ action: 'getBackupList' }, (response) => {
        console.log('Backup list response:', response);
        if (response && response.success && response.list) {
          response.list.forEach((vds) => {
            var op = document.createElement('option');
            op.setAttribute('label', vds['name']);
            op.setAttribute('value', vds['name']);
            op.setAttribute('select', 'select')
            $('#greetings').appendChild(op);
          })
          $('#count-repo').innerText = response.list.length
        } else if (response && response.error) {
          $('#message-error').innerText = response.error
          clearAndFadeMessage($('#message-error'))
        }
      })
    }
  })
}
