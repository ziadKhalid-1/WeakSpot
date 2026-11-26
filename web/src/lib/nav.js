// nav.js: the app's only way to change screen. One hash route per session status:
//   #/ (idle, Upload) · #/preparing · #/ready · #/quiz · #/done (Result)
export const go = (path) => {
  window.location.hash = path;
};

export const routeFor = (status) => (status === 'failed' ? '/preparing' : `/${status}`);
