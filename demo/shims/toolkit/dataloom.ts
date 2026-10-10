/** 存储替身：上传文件只在本标签页内生成临时地址，不离开浏览器。 */
export async function getDataloom() {
  return {
    storage: {
      from(bucketId: string) {
        return {
          generateDownloadUrlFromFilePath(path: string): string {
            return path;
          },
          async uploadFile(file: File) {
            const url = URL.createObjectURL(file);
            return {
              error: null,
              data: { id: `file-${Date.now()}`, file_path: url, bucket_id: bucketId, download_url: url },
            };
          },
        };
      },
    },
  };
}
