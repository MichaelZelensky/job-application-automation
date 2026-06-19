chrome.runtime.onMessage.addListener(message => {
    if (message.type !== 'COPY_TO_CLIPBOARD') return;

    const ta = document.createElement('textarea');
    ta.value = message.text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
});