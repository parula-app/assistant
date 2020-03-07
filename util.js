
export async function wait(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve();
      } catch (ex) {
        reject(ex);
      }
    }, seconds * 1000);
  });
}
