import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search as SearchIcon } from 'lucide-react';
import { SearchFilters } from '@/types/gallery';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import { ChevronDown } from 'lucide-react';

interface FilterPanelProps {
    onSearch: (filters: SearchFilters) => void;
    categories: string[];
    series: string[];
    initialFilters?: SearchFilters;
    showLoanFilter?: boolean;
}

export function FilterPanel({ onSearch, categories, series, initialFilters, showLoanFilter }: FilterPanelProps) {
    // Title
    const [title, setTitle] = useState(initialFilters?.title || '');

    // Loan Filter
    const [loanedToMyGallery, setLoanedToMyGallery] = useState(initialFilters?.loanedToMyGallery || false);

    // Year
    const [yearFrom, setYearFrom] = useState(initialFilters?.yearFrom?.toString() || '');
    const [yearTo, setYearTo] = useState(initialFilters?.yearTo?.toString() || '');

    // Category & Series
    const [selectedCategory, setSelectedCategory] = useState(initialFilters?.category || 'all');
    const [selectedSeries, setSelectedSeries] = useState(initialFilters?.series || 'all');

    // Materials
    const [materials, setMaterials] = useState(initialFilters?.materials || '');

    // Dimensions
    const [dimHMin, setDimHMin] = useState(initialFilters?.dimensionHMin?.toString() || '');
    const [dimHMax, setDimHMax] = useState(initialFilters?.dimensionHMax?.toString() || '');
    const [dimWMin, setDimWMin] = useState(initialFilters?.dimensionWMin?.toString() || '');
    const [dimWMax, setDimWMax] = useState(initialFilters?.dimensionWMax?.toString() || '');
    const [dimLMin, setDimLMin] = useState(initialFilters?.dimensionLMin?.toString() || '');
    const [dimLMax, setDimLMax] = useState(initialFilters?.dimensionLMax?.toString() || '');

    // Price
    const [priceMin, setPriceMin] = useState(initialFilters?.priceMin?.toString() || '');
    const [priceMax, setPriceMax] = useState(initialFilters?.priceMax?.toString() || '');

    // Exclude Flags
    const [excludeTitle, setExcludeTitle] = useState(initialFilters?.excludeTitle || false);
    const [excludeCategory, setExcludeCategory] = useState(initialFilters?.excludeCategory || false);
    const [excludeSeries, setExcludeSeries] = useState(initialFilters?.excludeSeries || false);
    const [excludeMaterials, setExcludeMaterials] = useState(initialFilters?.excludeMaterials || false);


    const handleApplyFilters = () => {
        onSearch({
            title: title || undefined,
            yearFrom: yearFrom ? Number(yearFrom) : undefined,
            yearTo: yearTo ? Number(yearTo) : yearFrom ? Number(yearFrom) : undefined,
            category: selectedCategory !== 'all' ? selectedCategory : undefined,
            series: selectedSeries !== 'all' ? selectedSeries : undefined,
            materials: materials || undefined,
            dimensionHMin: dimHMin ? Number(dimHMin) : undefined,
            dimensionHMax: dimHMax ? Number(dimHMax) : undefined,
            dimensionWMin: dimWMin ? Number(dimWMin) : undefined,
            dimensionWMax: dimWMax ? Number(dimWMax) : undefined,
            dimensionLMin: dimLMin ? Number(dimLMin) : undefined,
            dimensionLMax: dimLMax ? Number(dimLMax) : undefined,
            priceMin: priceMin ? Number(priceMin) : undefined,
            priceMax: priceMax ? Number(priceMax) : undefined,
            excludeTitle: excludeTitle || undefined,
            excludeCategory: excludeCategory || undefined,
            excludeSeries: excludeSeries || undefined,
            excludeMaterials: excludeMaterials || undefined,
            loanedToMyGallery: loanedToMyGallery || undefined,
        });
    };

    const handleClearFilters = () => {
        setTitle('');
        setYearFrom('');
        setYearTo('');
        setSelectedCategory('all');
        setSelectedSeries('all');
        setMaterials('');
        setDimHMin('');
        setDimHMax('');
        setDimWMin('');
        setDimWMax('');
        setDimLMin('');
        setDimLMax('');
        setPriceMin('');
        setPriceMax('');
        setExcludeTitle(false);
        setExcludeCategory(false);
        setExcludeSeries(false);
        setExcludeMaterials(false);
        setLoanedToMyGallery(false);
        onSearch({});
    };

    return (
        <div className="bg-background rounded-lg border border-border p-6">
            <div className="space-y-6">
                {/* Search Bar & Primary Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Title</label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                    checked={excludeTitle}
                                    onCheckedChange={(checked) => setExcludeTitle(checked === true)}
                                    className="h-4 w-4"
                                />
                                <span className="text-xs font-bold text-destructive">X</span>
                            </label>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Category</label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                    checked={excludeCategory}
                                    onCheckedChange={(checked) => setExcludeCategory(checked === true)}
                                    className="h-4 w-4"
                                />
                                <span className="text-xs font-bold text-destructive">X</span>
                            </label>
                        </div>
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full h-10 px-3 pr-10 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                            >
                                {categories.map((c) => (
                                    <option key={c} value={c}>
                                        {c === 'all' ? (categories.length > 1 ? 'All categories' : 'Loading categories...') : c}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {/* Series */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Series</label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <Checkbox
                                    checked={excludeSeries}
                                    onCheckedChange={(checked) => setExcludeSeries(checked === true)}
                                    className="h-4 w-4"
                                />
                                <span className="text-xs font-bold text-destructive">X</span>
                            </label>
                        </div>
                        <div className="relative">
                            <select
                                value={selectedSeries}
                                onChange={(e) => setSelectedSeries(e.target.value)}
                                className="w-full h-10 px-3 pr-10 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                            >
                                {series.map((s) => (
                                    <option key={s} value={s}>
                                        {s === 'all' ? 'All Series' : s}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {/* Year Range (Simple input for now, could be improved) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Year</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="From"
                                value={yearFrom}
                                onChange={(e) => setYearFrom(e.target.value)}
                                className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <input
                                type="number"
                                placeholder="To"
                                value={yearTo}
                                onChange={(e) => setYearTo(e.target.value)}
                                className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>
                </div>

                {/* Loan Filter */}
                {showLoanFilter && (
                    <div className="space-y-2 flex items-end pb-2">
                        <div className="flex items-center space-x-2 border p-2 rounded-md bg-background w-full h-10">
                            <Checkbox
                                id="loan-filter"
                                checked={loanedToMyGallery}
                                onCheckedChange={(checked) => setLoanedToMyGallery(checked === true)}
                            />
                            <label
                                htmlFor="loan-filter"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                Loaned to My Gallery
                            </label>
                        </div>
                    </div>
                )}
            </div>

            <Accordion type="single" collapsible>
                <AccordionItem value="advanced-filters" className="border-none">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2">
                        Advanced Filters (Dimensions, Materials, Price)
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            {/* Materials */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium">Materials</label>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <Checkbox
                                            checked={excludeMaterials}
                                            onCheckedChange={(checked) => setExcludeMaterials(checked === true)}
                                            className="h-4 w-4"
                                        />
                                        <span className="text-xs font-bold text-destructive">X</span>
                                    </label>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search materials..."
                                    value={materials}
                                    onChange={(e) => setMaterials(e.target.value)}
                                    className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

                            {/* Dimensions Height */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Height (cm)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={dimHMin}
                                        onChange={(e) => setDimHMin(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={dimHMax}
                                        onChange={(e) => setDimHMax(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Dimensions Length */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Length (cm)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={dimLMin}
                                        onChange={(e) => setDimLMin(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={dimLMax}
                                        onChange={(e) => setDimLMax(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Dimensions Width */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Width (cm)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={dimWMin}
                                        onChange={(e) => setDimWMin(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={dimWMax}
                                        onChange={(e) => setDimWMax(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Price (€)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={priceMin}
                                        onChange={(e) => setPriceMin(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={priceMax}
                                        onChange={(e) => setPriceMax(e.target.value)}
                                        className="w-full h-10 px-3 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                </div>
                            </div>
                        </div>

                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={handleClearFilters}>
                    Clear Filters
                </Button>
                <Button onClick={handleApplyFilters} className="gap-2">
                    <SearchIcon className="w-4 h-4" />
                    Apply Filters
                </Button>
            </div>
        </div>
    );
}
