import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Ingredient {
  ingredient_name: string;
  quantity_required: number;
}

interface Dish {
  id: number;
  name: string;
  type: string;
  ingredients: Ingredient[];
}

const DishList: React.FC = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDishIds, setExpandedDishIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedType, setEditedType] = useState("");
  const [editedIngredients, setEditedIngredients] = useState<Ingredient[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = (name?: string) => {
    setLoading(true);
    const endpoint = name && name.trim()
      ? `http://localhost:8000/dishes/by_name?partial_name=${encodeURIComponent(name.trim())}`
      : `http://localhost:8000/dishes`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error("Dishes not found");
        return res.json();
      })
      .then((data) => {
        setDishes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching dishes:", err);
        setDishes([]);
        setLoading(false);
      });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchDishes(value);
  };

  const toggleDish = (id: number) => {
    setExpandedDishIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const deleteDish = async (dishName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${dishName}"?`)) return;

    try {
      const res = await fetch(`http://localhost:8000/dishes/${encodeURIComponent(dishName)}?confirm=true`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete dish");
      }

      setDishes((prev) => prev.filter((d) => d.name !== dishName));
    } catch (error: any) {
      console.error("Delete failed:", error.message);
      alert(`Error: ${error.message}`);
    }
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    setEditedName(dish.name);
    setEditedType(dish.type);
    setEditedIngredients([...dish.ingredients]);
  };

  const updateDish = async () => {
    if (!editingDish) return;

    const updatedData = {
      name: editedName,
      type: editedType,
      ingredients: editedIngredients,
    };

    try {
      const res = await fetch(`http://localhost:8000/dishes/${editingDish.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error("Failed to update dish");

      setEditingDish(null);
      fetchDishes();
    } catch (err) {
      alert("Update failed");
      console.error(err);
    }
  };

  const handleIngredientChange = (index: number, field: "ingredient_name" | "quantity_required", value: string) => {
    setEditedIngredients((prev) => {
      const updated = [...prev];
      updated[index][field] = field === "quantity_required" ? Number(value) : value;
      return updated;
    });
  };

  const addIngredientField = () => {
    setEditedIngredients([...editedIngredients, { ingredient_name: "", quantity_required: 0 }]);
  };

  const removeIngredientField = (index: number) => {
    setEditedIngredients(editedIngredients.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleExcelUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/upload_dish_excel", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert(response.data.message || "Dishes uploaded successfully!");
      setDetails(response.data);
      setStatus("Upload complete");
      fetchDishes();
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(error.response?.data?.detail || "Failed to upload Excel.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>📦 Upload dish Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept=".xlsx,.xls" onChange={handleChange} />
          <Button onClick={handleExcelUpload} disabled={!file}>
            Upload
          </Button>
          {status && <p className="text-sm text-gray-700">{status}</p>}
          {details && (
            <div className="text-sm bg-gray-50 p-3 rounded border space-y-2">
              <div>
                <strong>✅ Added:</strong>{" "}
                {details.added_dishes?.length > 0 ? details.added_dishes.join(", ") : "None"}
              </div>
              {details.skipped_rows?.length > 0 && (
                <div>
                  <strong>⚠️ Skipped Rows:</strong>
                  <ul className="list-disc pl-5">
                    {details.skipped_rows.map((row: string, idx: number) => (
                      <li key={idx}>{row}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
        <Input
          type="text"
          placeholder="Search dish by name..."
          value={searchTerm}
          onChange={handleSearch}
          className="pl-10 bg-white border-2 border-gray-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground">Loading dishes...</div>
      ) : dishes.length === 0 ? (
        <div className="text-center text-red-600 bg-red-100 border border-red-400 rounded-lg p-4 font-medium">
          No matching dishes found.
        </div>
      ) : (
        <div className="space-y-4">
          {dishes.map((dish) => {
            const isOpen = expandedDishIds.has(dish.id);
            return (
              <div key={dish.id} className="border rounded-2xl p-4 shadow-sm bg-white hover:shadow-md transition-all">
                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleDish(dish.id)}>
                  <div>
                    <h2 className="text-lg font-semibold">{dish.name}</h2>
                    <Badge variant="outline" className="mt-1">{dish.type}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditModal(dish); }}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); deleteDish(dish.name); }}>Delete</Button>
                    {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <Separator className="my-4" />
                      <ul className="space-y-2">
                        {dish.ingredients.map((ingredient, index) => (
                          <li key={index} className="flex justify-between text-sm text-gray-700">
                            <span>{ingredient.ingredient_name}</span>
                            <span className="text-gray-500">{ingredient.quantity_required}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dish Modal */}
      <Dialog open={!!editingDish} onOpenChange={() => setEditingDish(null)}>
        <DialogContent className="space-y-4">
          <DialogTitle>Edit Dish</DialogTitle>
          <div>
            <Label>Name</Label>
            <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={editedType} onChange={(e) => setEditedType(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ingredients</Label>
            {editedIngredients.map((ing, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={ing.ingredient_name}
                  onChange={(e) => handleIngredientChange(index, "ingredient_name", e.target.value)}
                  placeholder="Ingredient name"
                />
                <Input
                  type="number"
                  value={ing.quantity_required}
                  onChange={(e) => handleIngredientChange(index, "quantity_required", e.target.value)}
                  placeholder="Quantity"
                />
                <Button variant="ghost" size="sm" onClick={() => removeIngredientField(index)} className="text-red-500">Remove</Button>
              </div>
            ))}
            <Button variant="outline" onClick={addIngredientField}>+ Add Ingredient</Button>
          </div>
          <Button onClick={updateDish}>Update</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DishList;
