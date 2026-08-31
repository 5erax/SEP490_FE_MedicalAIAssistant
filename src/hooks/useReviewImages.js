import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImageToCloudinary, validateCloudinaryImage } from "../services/cloudinaryUploadService";
import { MAX_REVIEW_IMAGES, reviewImagePatch } from "../utils/reviewImages";

export default function useReviewImages() {
  const [images, setImages] = useState([]);
  const [original, setOriginal] = useState([]);
  const [message, setMessage] = useState("");
  const itemsRef = useRef([]);
  const generation = useRef(0);
  const jobs = useRef(new Map());

  const update = useCallback((next) => {
    itemsRef.current = typeof next === "function" ? next(itemsRef.current) : next;
    setImages(itemsRef.current);
  }, []);
  const dispose = useCallback(() => {
    generation.current += 1;
    jobs.current.forEach((controller) => controller.abort());
    jobs.current.clear();
    itemsRef.current.forEach((image) => { if (image.preview) URL.revokeObjectURL(image.preview); });
  }, []);
  useEffect(() => () => dispose(), [dispose]);

  const reset = useCallback((initial = []) => {
    dispose();
    update(initial);
    setOriginal(initial);
    setMessage("");
  }, [dispose, update]);

  const upload = useCallback(async (image, version) => {
    const controller = new AbortController();
    jobs.current.set(image.key, controller);
    update((current) => current.map((item) => item.key === image.key ? { ...item, status: "uploading", error: "" } : item));
    try {
      const { secureUrl } = await uploadImageToCloudinary(image.file, { signal: controller.signal });
      if (generation.current !== version || controller.signal.aborted) return;
      update((current) => current.map((item) => item.key === image.key ? { ...item, url: secureUrl, status: "ready" } : item));
    } catch (error) {
      if (generation.current !== version || controller.signal.aborted) return;
      update((current) => current.map((item) => item.key === image.key
        ? { ...item, status: "error", error: error.message || "Ảnh chưa tải được. Hãy thử lại." } : item));
    } finally {
      if (jobs.current.get(image.key) === controller) jobs.current.delete(image.key);
    }
  }, [update]);

  const addFiles = useCallback((files) => {
    if (!files.length) return;
    const remaining = MAX_REVIEW_IMAGES - itemsRef.current.length;
    if (files.length > remaining) {
      setMessage(remaining > 0 ? `Bạn chỉ có thể thêm ${remaining} ảnh. Hãy chọn lại.` : "Bạn đã chọn đủ 5 ảnh. Hãy bỏ bớt ảnh trước khi thêm.");
      return;
    }
    try { files.forEach(validateCloudinaryImage); }
    catch (error) { setMessage(error.message); return; }
    setMessage("");
    const added = files.map((file) => ({ key: `photo-${crypto.randomUUID()}`, file,
      name: file.name, preview: URL.createObjectURL(file), status: "uploading", url: "" }));
    update((current) => [...current, ...added]);
    const version = generation.current;
    added.forEach((image) => { void upload(image, version); });
  }, [update, upload]);

  const remove = useCallback((key) => {
    jobs.current.get(key)?.abort();
    jobs.current.delete(key);
    const image = itemsRef.current.find((item) => item.key === key);
    if (image?.preview) URL.revokeObjectURL(image.preview);
    update((current) => current.filter((item) => item.key !== key));
    setMessage("");
  }, [update]);

  const retry = useCallback((key) => {
    const image = itemsRef.current.find((item) => item.key === key);
    if (image?.file && image.status === "error") void upload(image, generation.current);
  }, [upload]);

  return { images, original, message, reset, addFiles, remove, retry,
    uploading: images.some((image) => image.status === "uploading"),
    hasErrors: images.some((image) => image.status === "error"),
    dirty: images.some((image) => image.status !== "ready") || Object.keys(reviewImagePatch(original, images)).length > 0 };
}
