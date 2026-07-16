import { useEffect, useState } from 'react';
import { chatApi } from '../api/chat.api';
import { formatBytes } from '../lib/format';
import type { ChatAttachment } from '../types';
import { FileTextIcon } from './icons';

interface Props {
  messageId: string;
  attachment: ChatAttachment;
  mine: boolean;
}

// Muestra el adjunto de un mensaje. La descarga va por axios (cookies de
// sesión) y se expone como object URL; por eso liberamos la URL al desmontar.
export function ChatAttachmentView({ messageId, attachment, mine }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Las imágenes se previsualizan inline: cargamos el blob al montar.
  useEffect(() => {
    if (!attachment.isImage) return;
    let revoke: string | null = null;
    let active = true;
    chatApi
      .attachment(messageId)
      .then((blob) => {
        if (!active) return;
        const url = URL.createObjectURL(blob);
        revoke = url;
        setImageUrl(url);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [messageId, attachment.isImage]);

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await chatApi.attachment(messageId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (attachment.isImage) {
    return (
      <button
        type="button"
        onClick={download}
        title="Descargar imagen"
        className="mt-1 block overflow-hidden rounded-lg border border-black/10"
      >
        {imageUrl ? (
          <img src={imageUrl} alt={attachment.name} className="max-h-52 max-w-full object-cover" />
        ) : (
          <div className="flex h-24 w-40 items-center justify-center bg-black/5 text-xs text-slate-400">
            Cargando imagen…
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={downloading}
      className={`mt-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
        mine
          ? 'border-white/30 bg-white/10 hover:bg-white/20'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <FileTextIcon className={`h-5 w-5 shrink-0 ${mine ? 'text-white' : 'text-brand-600'}`} />
      <span className="min-w-0">
        <span className="block max-w-[12rem] truncate font-medium">{attachment.name}</span>
        <span className={mine ? 'text-white/70' : 'text-slate-400'}>
          {downloading ? 'Descargando…' : formatBytes(attachment.size)}
        </span>
      </span>
    </button>
  );
}
