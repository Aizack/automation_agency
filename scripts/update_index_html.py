with open('dashboard/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<script async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>'
replacement = '<script id="facebook-jssdk" async defer crossorigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js"></script>'

if target in text:
    text = text.replace(target, replacement)
    with open('dashboard/index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('INDEX HTML UPDATED')
else:
    print('TARGET NOT FOUND')
