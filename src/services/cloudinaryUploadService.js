const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function getRuntimeCloudinaryConfig() {
  if (typeof window === "undefined") return {};
  return window.__MEDIMATE_CLOUDINARY_CONFIG__ ?? {};
}

export function getCloudinaryUploadConfig() {
  const runtimeConfig = getRuntimeCloudinaryConfig();

  return {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || runtimeConfig.cloudName || "",
    uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || runtimeConfig.uploadPreset || "",
    folder: import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || runtimeConfig.folder || "",
  };
}

export function validateCloudinaryImage(file) {
  if (!file) {
    throw new Error("Hãy chọn một file ảnh để tải lên.");
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error("Cloudinary chỉ nhận file ảnh ở trường này.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Ảnh tối đa 5 MB. Hãy chọn ảnh nhẹ hơn.");
  }
}

export async function uploadImageToCloudinary(file) {
  validateCloudinaryImage(file);
  const { cloudName, uploadPreset, folder } = getCloudinaryUploadConfig();

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Chưa cấu hình Cloudinary. Hãy thêm VITE_CLOUDINARY_CLOUD_NAME và VITE_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  if (folder) formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.secure_url) {
    throw new Error(payload.error?.message || "Không thể tải ảnh lên Cloudinary. Vui lòng thử lại.");
  }

  return {
    secureUrl: payload.secure_url,
    publicId: payload.public_id,
  };
}
