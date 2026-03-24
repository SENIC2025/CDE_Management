import { useState, useCallback } from 'react';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

const INITIAL: ConfirmState = {
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  variant: 'danger',
  onConfirm: () => {},
};

/**
 * Hook to manage ConfirmDialog state.
 * Returns [dialogProps, confirm(options)] — spread dialogProps onto ConfirmDialog,
 * call confirm() wherever you used to call window.confirm().
 *
 * Usage:
 *   const [confirmProps, confirm] = useConfirm();
 *   // ...
 *   const ok = await confirm({ title: 'Delete?', message: 'This cannot be undone.' });
 *   if (ok) { doDelete(); }
 *   // ...
 *   <ConfirmDialog {...confirmProps} />
 */
export default function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL);
  const [resolveRef, setResolveRef] = useState<{ resolve: (v: boolean) => void } | null>(null);

  const confirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      variant?: 'danger' | 'warning' | 'info';
    }): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setResolveRef({ resolve });
        setState({
          open: true,
          title: opts.title,
          message: opts.message,
          confirmLabel: opts.confirmLabel || 'Delete',
          variant: opts.variant || 'danger',
          onConfirm: () => {},
        });
      });
    },
    []
  );

  const onConfirm = useCallback(() => {
    resolveRef?.resolve(true);
    setState(INITIAL);
    setResolveRef(null);
  }, [resolveRef]);

  const onCancel = useCallback(() => {
    resolveRef?.resolve(false);
    setState(INITIAL);
    setResolveRef(null);
  }, [resolveRef]);

  const dialogProps = {
    open: state.open,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    variant: state.variant,
    onConfirm,
    onCancel,
  };

  return [dialogProps, confirm] as const;
}
