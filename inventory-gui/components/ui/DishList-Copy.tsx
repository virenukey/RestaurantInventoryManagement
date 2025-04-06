import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp } from "lucide-react";
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

  useEffect(() => {
    fetch("http://localhost:8000/dishes")
      .then((res) => res.json())
      .then((data) => {
        setDishes(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching dishes:", err);
        setLoading(false);
      });
  }, []);

  const toggleDish = (id: number) => {
    setExpandedDishIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  if (loading) {
    return <div className="p-6 text-center">Loading dishes...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
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
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
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
  );
};

export default DishList;
