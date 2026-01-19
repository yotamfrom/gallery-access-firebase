import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collection } from "@/types/gallery";
import { Loader2 } from "lucide-react";

interface CreateCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (name: string, description: string) => Promise<void>;
}

export function CreateCollectionDialog({
    open,
    onOpenChange,
    onSubmit,
}: CreateCollectionDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        try {
            await onSubmit(name, description);
            setName("");
            setDescription("");
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Collection</DialogTitle>
                    <DialogDescription>
                        Create a new collection to save your selected artworks.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Collection Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Summer Selection"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add some notes about this collection..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Collection
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

interface AddToCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collections: Collection[];
    isLoading: boolean;
    onSubmit: (collectionId: string) => Promise<void>;
}

export function AddToCollectionDialog({
    open,
    onOpenChange,
    collections,
    isLoading,
    onSubmit,
}: AddToCollectionDialogProps) {
    const [selectedId, setSelectedId] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset selection when dialog opens
    useEffect(() => {
        if (open) setSelectedId("");
    }, [open]);

    const handleSubmit = async () => {
        if (!selectedId) return;

        setIsSubmitting(true);
        try {
            await onSubmit(selectedId);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add to Existing Collection</DialogTitle>
                    <DialogDescription>
                        Select a collection to add your selected artworks to.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : collections.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No collections found. Create a new one first.
                        </div>
                    ) : (
                        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                            {collections.map((collection) => (
                                <div
                                    key={collection.collection_id}
                                    className={`flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent transition-colors ${selectedId === collection.collection_id
                                        ? "border-primary bg-accent"
                                        : "border-border"
                                        }`}
                                    onClick={() => setSelectedId(collection.collection_id)}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium">{collection.CollectionName}</span>
                                        {collection.Description && (
                                            <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                                {collection.Description}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {(() => {
                                            try {
                                                const d = new Date(collection.CreatedAt);
                                                return isNaN(d.getTime()) ? String(collection.CreatedAt).split(' ')[0] : d.toLocaleDateString();
                                            } catch {
                                                return '';
                                            }
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedId || isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Artworks
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
