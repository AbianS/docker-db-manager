import { Loader2, Save, X } from 'lucide-react';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { databaseRegistry } from '@/features/databases/registry/database-registry';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import type { Container } from '@/shared/types/container';
import { EditContainerForm } from './EditContainerForm';

interface ConfigurationTabProps {
  container: Container;
  form: UseFormReturn<any>;
  saving: boolean;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

export function ConfigurationTab({
  container,
  form,
  saving,
  onSave,
  onCancel,
}: ConfigurationTabProps) {
  const provider = databaseRegistry.get(container.dbType);

  const {
    handleSubmit,
    formState: { isDirty },
  } = form;

  const handleSave = async () => {
    await handleSubmit(async (data) => {
      await onSave(data);
    })();
  };

  const handleCancel = () => {
    onCancel();
  };

  if (!provider) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Provider not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Content area - always editable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pt-4 pb-6">
          <EditContainerForm
            container={container}
            provider={provider}
            form={form}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-background">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={saving || !isDirty}
          >
            <X className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function useUnsavedChangesWarning() {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const checkUnsavedChanges = (
    hasUnsavedChanges: boolean,
    action: () => void,
  ): boolean => {
    if (!hasUnsavedChanges) {
      action();
      return true;
    }

    setPendingAction(() => action);
    setShowDialog(true);
    return false;
  };

  const handleDiscard = () => {
    if (pendingAction) {
      pendingAction();
    }
    setShowDialog(false);
    setPendingAction(null);
  };

  const handleCancel = () => {
    setShowDialog(false);
    setPendingAction(null);
  };

  const UnsavedChangesDialog = () => (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. Are you sure you want to leave? Your
            changes will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Stay
          </Button>
          <Button variant="destructive" onClick={handleDiscard}>
            Discard Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    checkUnsavedChanges,
    UnsavedChangesDialog,
  };
}
