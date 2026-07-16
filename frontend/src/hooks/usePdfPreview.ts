import { useCallback, useEffect, useState } from 'react';
import { documentsApi } from '../api/documents.api';
import { getApiErrorMessage } from '../api/client';
import { downloadBlob } from '../lib/download';
import type { DocumentItem } from '../types';

interface PreviewState {
  open: boolean;
  loading: boolean;
  title: string;
  url: string | null;
}

const CLOSED: PreviewState = { open: false, loading: false, title: '', url: null };

/**
 * Gestiona la previsualización de un PDF dentro de la web: descarga el blob
 * (respetando el auto-refresh del cliente axios), crea un object URL para el
 * iframe y permite descargarlo. Libera el object URL al cerrar.
 */
export function usePdfPreview() {
  const [state, setState] = useState<PreviewState>(CLOSED);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [filename, setFilename] = useState('documento.pdf');
  const [error, setError] = useState<string | null>(null);

  // Libera el object URL anterior cuando cambia o al desmontar.
  useEffect(() => {
    return () => {
      if (state.url) URL.revokeObjectURL(state.url);
    };
  }, [state.url]);

  const preview = useCallback(async (doc: DocumentItem) => {
    setError(null);
    setFilename(doc.originalName);
    setState({ open: true, loading: true, title: doc.originalName, url: null });
    try {
      const fetched = await documentsApi.download(doc.id);
      setBlob(fetched);
      const url = URL.createObjectURL(fetched);
      setState({ open: true, loading: false, title: doc.originalName, url });
    } catch (err) {
      setState(CLOSED);
      setError(getApiErrorMessage(err, 'No se pudo abrir el documento'));
    }
  }, []);

  const close = useCallback(() => {
    setState((prev) => {
      if (prev.url) URL.revokeObjectURL(prev.url);
      return CLOSED;
    });
    setBlob(null);
  }, []);

  const download = useCallback(() => {
    if (blob) downloadBlob(blob, filename);
  }, [blob, filename]);

  return { state, error, preview, close, download };
}
