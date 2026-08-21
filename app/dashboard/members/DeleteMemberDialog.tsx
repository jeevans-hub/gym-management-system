'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MemberListItem } from './types';

interface DeleteMemberDialogProps {
  member: MemberListItem;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteMemberDialog({ member, onClose, onDeleted }: DeleteMemberDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const deletingRef = useRef(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    deletingRef.current = deleting;
  }, [deleting]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingRef.current) onClose();
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose]);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/members/${encodeURIComponent(member.memberId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (response.status === 401) {
        router.replace('/login');
        router.refresh();
        return;
      }
      if (response.status === 404) {
        setError('This member no longer exists. Refresh the directory and try again.');
        return;
      }
      if (!response.ok) {
        setError('The member could not be deleted. Please try again.');
        return;
      }

      onDeleted();
    } catch {
      setError('The member could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-member-title"
        aria-describedby="delete-member-description"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">!</div>
        <h2 id="delete-member-title" className="mt-4 text-xl font-bold text-gray-900">Delete member?</h2>
        <p id="delete-member-description" className="mt-2 text-sm leading-6 text-gray-600">
          You are about to permanently delete{' '}
          <strong className="font-semibold text-gray-900">
            {member.memberId} — {member.firstName} {member.lastName}
          </strong>.
          {' '}This action cannot be undone.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete member'}
          </button>
        </div>
      </div>
    </div>
  );
}
