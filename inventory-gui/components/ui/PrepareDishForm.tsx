import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

const API_URL = "http://localhost:8000"; // Update if backend is on a different host/port

export default function PrepareDishForm() {
  const [dishName, setDishName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState("");
  const [dishes, setDishes] = useState([]);

  // Fetch dish list on mount
  useEffect(() => {
    const fetchDishes = async () => {
      try {
        const res = await axios.get(`${API_URL}/dishes`);
        setDishes(res.data);
      } catch (error) {
        console.error("Failed to fetch dishes", error);
      }
    };
    fetchDishes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dishName || !quantity) {
      alert("Dish name and quantity are required.");
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/prepare_dish`, null, {
        params: {
          dish_name: dishName,
          quantity: parseFloat(quantity),
          date: date || undefined, // optional
        },
      });
      toast.success(res.data.message || "Dish prepared successfully!");
      setDishName("");
      setQuantity("");
      setDate("");
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.detail || "Failed to prepare dish.";
      toast.error(msg);
    }
  };

  return (
    <Card className="max-w-xl mx-auto mt-8 p-6 shadow-lg rounded-xl bg-white">
      <CardContent className="space-y-4">
        <h2 className="text-xl font-bold">🍽️ Prepare Dish</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <Label>Dish Name</Label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              required
            >
              <option value="">Select dish</option>
              {dishes.map((dish: any) => (
                <option key={dish.id} value={dish.name}>
                  {dish.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Quantity (Servings)</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Date (optional)</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <Button type="submit">Prepare</Button>
        </form>
      </CardContent>
    </Card>
  );
}
