import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    fetchDishes(); // Load all dishes on mount
  }, []);

  const fetchDishes = (name?: string) => {
    setLoading(true);
    const endpoint = name && name.trim()
      ? `http://localhost:8000/dishes/by_name?partial_name=${encodeURIComponent(name.trim())}`
      : `http://localhost:8000/dishes`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Dishes not found");
        }
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

  const [dishToDelete, setDishToDelete] = useState<Dish | null>(null);

  const deleteDish = async (dishName: string) => {
  if (!window.confirm(`Are you sure you want to delete "${dishName}"?`)) return;

  try {
    const res = await fetch(
      `http://localhost:8000/dishes/${encodeURIComponent(dishName)}?confirm=true`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.detail || "Failed to delete dish");
    }

    // Refresh dish list after delete
    setDishes((prev) => prev.filter((d) => d.name !== dishName));
  } catch (error: any) {
    console.error("Delete failed:", error.message);
    alert(`Error: ${error.message}`);
  }
};


  return (
  <div className="p-6 max-w-4xl mx-auto space-y-6">
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
  No matching dishes found.</div>

    ) : (
      <div className="space-y-4">
        {dishes.map((dish) => {
          const isOpen = expandedDishIds.has(dish.id);
          return (
            <div
              key={dish.id}
              className="border rounded-2xl p-4 shadow-sm bg-white hover:shadow-md transition-all"
            >
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleDish(dish.id)}
              >
                <div>
                  <h2 className="text-lg font-semibold">{dish.name}</h2>
                  <Badge variant="outline" className="mt-1">{dish.type}</Badge>
                </div>

                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDish(dish.name);
                    }}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Separator className="my-4" />
                    <ul className="space-y-2">
                      {dish.ingredients.map((ingredient, index) => (
                        <li
                          key={index}
                          className="flex justify-between text-sm text-gray-700"
                        >
                          <span>{ingredient.ingredient_name}</span>
                          <span className="text-gray-500">
                            {ingredient.quantity_required}
                          </span>
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
  </div>
);

};

export default DishList;
