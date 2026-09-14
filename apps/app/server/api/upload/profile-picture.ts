export default eventHandler(async (event) => {
  return hubBlob().handleUpload(event, {
    formKey: "files",
    multiple: false,
    ensure: {
      types: ["image/jpeg", "image/png"],
      maxSize: "2MB",
    },
    put: {
      prefix: "profile",
      addRandomSuffix: true,
    },
  });
});
