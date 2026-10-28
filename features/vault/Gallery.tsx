import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  listAttachments,
  readImage,
  uploadImage,
  downloadBlob,
  resumeAttachment,
  type Attachment,
} from "./attachments";
import { buttonClass, ErrorText, Modal } from "./ui";
import type { Parent } from "../customers/types";
import { onVaultLock } from "./session";

function Photo({ row, onReload }: { row: Attachment; onReload: () => void }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [zoom, setZoom] = useState(false);
  const container = useRef<HTMLDivElement>(null),
    [nearViewport, setNearViewport] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry.isIntersecting),
      { rootMargin: "240px" },
    );
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true,
      objectUrl = "";
    const clear = () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl("");
    };
    const unsubscribe = onVaultLock(clear);
    if (row.status === "ready" && (nearViewport || zoom)) {
      setError("");
      void readImage(row)
        .then((blob) => {
          if (active) {
            objectUrl = URL.createObjectURL(blob);
            setUrl(objectUrl);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    return () => {
      clear();
      unsubscribe();
    };
  }, [row, nearViewport, zoom]);
  const download = async (share: boolean) => {
    try {
      const blob = await readImage(row),
        file = new File([blob], row.data.name, { type: row.data.mime });
      if (share && navigator.canShare?.({ files: [file] }))
        await navigator.share({ files: [file] });
      else downloadBlob(blob, row.data.name);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div
      ref={container}
      className="rounded-xl border border-slate-700 p-3 min-w-0"
    >
      <p className="text-sm mb-2 truncate">{row.data.label || row.data.name}</p>
      {url && (
        <button
          type="button"
          className="w-full"
          aria-label="بزرگ‌نمایی تصویر"
          onClick={() => setZoom(true)}
        >
          <img
            src={url}
            className="h-32 w-full object-contain rounded-lg"
            alt={row.data.label || row.data.name}
          />
        </button>
      )}
      {row.status === "pending" && (
        <div className="space-y-2">
          <p className="text-amber-300 text-xs">
            بارگذاری ناقص؛ به‌عنوان تصویر سالم ثبت نشده است. اگر فایل ارسال شده
            باشد، قابل تکمیل است؛ در غیر این صورت تصویر را دوباره انتخاب کنید.
          </p>
          <button
            className={buttonClass}
            type="button"
            onClick={() =>
              void resumeAttachment(row)
                .then(onReload)
                .catch((e) => setError(e.message))
            }
          >
            بررسی و تکمیل بارگذاری
          </button>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      {url && (
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            className={buttonClass}
            onClick={() => void download(false)}
          >
            دانلود اصل
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => void download(true)}
          >
            ذخیره / اشتراک
          </button>
        </div>
      )}
      {zoom && (
        <Modal
          title={row.data.label || row.data.name}
          onClose={() => setZoom(false)}
        >
          <img
            src={url}
            className="w-full object-contain"
            alt={row.data.name}
          />
        </Modal>
      )}
    </div>
  );
}
export function Gallery({
  parent,
  customerId,
  label = "",
}: {
  parent: Parent;
  customerId?: string;
  label?: string;
}) {
  const [rows, setRows] = useState<Attachment[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { id, kind } = parent;
  const load = useCallback(
    () =>
      listAttachments({ id, kind })
        .then(setRows)
        .catch((e) => setError(e.message)),
    [id, kind],
  );
  useEffect(() => {
    void load();
    return onVaultLock(() => setRows([]));
  }, [load]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="font-medium">{label || "تصاویر و پیوست‌ها"}</h3>
        <label className={`${buttonClass} cursor-pointer`}>
          {busy ? "در حال بارگذاری و بررسی…" : "افزودن تصاویر"}
          <input
            className="sr-only"
            aria-label={`افزودن ${label || "تصاویر"}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={busy}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              setBusy(true);
              setError("");
              try {
                for (const file of files)
                  await uploadImage(file, parent, customerId, label);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
                await load();
              }
            }}
          />
        </label>
        <span className="text-xs text-slate-400">
          JPG، PNG و WebP · هر تصویر تا ۲۰ مگابایت
        </span>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="grid sm:grid-cols-2 gap-3">
        {rows
          .filter((r) => !label || r.data.label === label)
          .map((row) => (
            <Photo key={row.id} row={row} onReload={() => void load()} />
          ))}
      </div>
    </div>
  );
}
