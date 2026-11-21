export async function requestFrontCamera() {
  if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Camera unavailable","NotSupportedError");
  return navigator.mediaDevices.getUserMedia({audio:false,video:{
    facingMode:{ideal:"user"},width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}
  }});
}

export function headAim(face, center, travel) {
  const offset = face.headX - center;
  const movement = Math.sign(offset) * Math.max(0, Math.abs(offset) - .007);
  return Math.max(0, Math.min(1, .5 + movement / (2 * travel)));
}

export class HeadCalibration {
  since = null;
  center = .5;
  travel = .16;

  sample(face, now) {
    if (!face?.closed) { this.since=null; return false; }
    if (this.since===null) { this.since=now; this.center=face.headX; }
    this.center+=(face.headX-this.center)*.3;
    this.travel=Math.max(.11,Math.min(.23,face.faceWidth*.55));
    return now-this.since>=300;
  }

  target(face) { return headAim(face,this.center,this.travel); }
}

export function followAim(current, target, deltaSeconds) {
  return current+(target-current)*(1-Math.exp(-deltaSeconds/.075));
}

export class BiteGesture {
  constructor() { this.reset(); }
  reset() { this.open=false; this.armed=false; this.latched=false; }
  sample(face) {
    if (!face) { this.open=false; return; }
    if (face.closed) { this.armed=true; this.open=false; this.latched=false; }
    if (face.open && this.armed) this.open=true;
  }
  ready(eyesShut, fresh) { return this.open && !this.latched && !eyesShut && fresh; }
  consume() { this.latched=true; }
}

export const feastHoldMs = 500;
