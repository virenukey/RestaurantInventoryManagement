      <Card className="bg-gradient-to-br from-yellow-200 to-white shadow-lg rounded-lg">
        <CardContent>
          <h2 className="text-xl font-bold">Inventory On Date</h2>
          <Input className="w-50 border rounded px-2 py-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button onClick={handleInventoryOnDate}>Fetch</Button>
          <ul>
            {dateInventory.map((log, index) => (
              <li key={index}>
                Ingredient ID: {log.ingredient_id}, Quantity Left: {log.quantity_left}, Date: {log.date}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>