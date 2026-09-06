export default eventHandler(async (event) => {
  return hubBlob().handleUpload(event, {
    formKey: "files",
    multiple: true,
    ensure: {
      types: [
        "image/jpeg",
        "image/png",
        "application/pdf",
        "application/msword",
        "text/markdown",
        "text/plain",
      ],
      maxSize: "2MB",
    },
    put: {
      prefix: "assistant",
      addRandomSuffix: true,
    },
  });
});
