const socket = io("/")
const list = document.getElementById("msg");
const qrimg = document.getElementById("qrimage");

socket.on("msg", (msg) => {
  const li = document.createElement('li')
  li.innerHTML = msg;
  list.append(li);
})

socket.on("qr", (qr) => {
  console.log(qr);
  var qrcode = new QRious({
    element: qrimg,
    background: '#ffffff',
    backgroundAlpha: 1,
    foreground: '#5868bf',
    foregroundAlpha: 1,
    level: 'H',
    padding: 2,
    size: 250,
    value: qr
  });
//    qrimg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400&bgcolor=255-255-255&color=0-0-0&qrzone=2&data=${encodeURI(qr)}`;
})