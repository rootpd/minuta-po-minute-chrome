function saveOptions() {
  var interval = document.getElementById('interval').value;
  var sound = document.getElementById('sound').value;

  chrome.storage.sync.set({
    "sound": sound,
    "interval": interval  
  }, function() {
    var submit = document.getElementById('save');
    submit.classList.add('i-check');
    
    setTimeout(function() {
      submit.classList.remove('i-check');
    }, 1200);
  });
}

function restoreOptions() {
  chrome.storage.sync.get({
    "sound": "no-sound",
    "interval": 1
  }, function(items) {
    document.getElementById('interval').value = items.interval;
    document.getElementById('sound').value = items.sound;
  });

}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
