import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  KeyboardEvent,
  JSX,
} from "react";

/**
 * =========================
 * Types
 * =========================
 */

type CustomerId = string;

interface Customer {
  id: CustomerId;
  name: string;
  mobile: string;
  address: string;
  totalPurchase: number;
  paid: number;
  balance: number;
}

/**
 * =========================
 * Mock Data (replaceable by API)
 * =========================
 * This is intentionally structured so switching to a backend is trivial:
 * replace `useCustomers()` implementation.
 */

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "1",
    name: "John Doe",
    mobile: "9876543210",
    address: "12 Market Street",
    totalPurchase: 12000,
    paid: 10000,
    balance: 2000,
  },
  {
    id: "2",
    name: "Jane Smith",
    mobile: "9123456780",
    address: "88 Lake View",
    totalPurchase: 8000,
    paid: 8000,
    balance: 0,
  },
  {
    id: "3",
    name: "Rahul Verma",
    mobile: "9988776655",
    address: "Green Park",
    totalPurchase: 5400,
    paid: 3000,
    balance: 2400,
  },
];

/**
 * =========================
 * Data Access Abstraction
 * =========================
 * Future-ready hook for API integration.
 */

function useCustomers(): Customer[] {
  return MOCK_CUSTOMERS;
}

/**
 * =========================
 * Utilities
 * =========================
 */

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * =========================
 * Main Component
 * =========================
 */

export default function CustomerAutocomplete(): JSX.Element {
  const customers = useCustomers();

  // Typed inputs
  const [nameInput, setNameInput] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [addressInput, setAddressInput] = useState("");

  // Selected customer entity
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  // Suggestion UX state
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * =========================
   * Derived Suggestions
   * =========================
   */
  const suggestions = useMemo(() => {
    const query = normalize(nameInput);
    if (!query) return [];

    return customers.filter((c) => {
      return (
        normalize(c.name).includes(query) ||
        normalize(c.mobile).includes(query)
      );
    });
  }, [customers, nameInput]);

  /**
   * =========================
   * Handlers
   * =========================
   */

  const selectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setNameInput(customer.name);
    setMobileInput(customer.mobile);
    setAddressInput(customer.address);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const handleNameChange = useCallback(
    (value: string) => {
      setNameInput(value);

      // If user edits after selection, clear selected customer
      if (selectedCustomer && value !== selectedCustomer.name) {
        setSelectedCustomer(null);
      }

      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [selectedCustomer]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === "Escape") setIsOpen(false);
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          break;

        case "Enter":
          if (highlightedIndex >= 0) {
            e.preventDefault();
            selectCustomer(suggestions[highlightedIndex]);
          }
          break;

        case "Escape":
          setIsOpen(false);
          break;
      }
    },
    [highlightedIndex, isOpen, selectCustomer, suggestions]
  );

  /**
   * =========================
   * Click Outside Handler
   * =========================
   */

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /**
   * =========================
   * Render
   * =========================
   */

  return (
    <div
      ref={containerRef}
      style={{
        width: 420,
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      <h3>Customer</h3>

      {/* Name */}
      <div style={{ position: "relative" }}>
        <input
          value={nameInput}
          onChange={(e) => handleNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Customer name or mobile"
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          style={{ width: "100%", padding: 8 }}
        />

        {isOpen && suggestions.length > 0 && (
          <ul
            style={{
              position: "absolute",
              zIndex: 10,
              background: "#fff",
              border: "1px solid #ccc",
              width: "100%",
              maxHeight: 200,
              overflowY: "auto",
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {suggestions.map((c, index) => (
              <li
                key={c.id}
                onMouseDown={() => selectCustomer(c)} // onMouseDown avoids blur before click
                style={{
                  padding: 8,
                  cursor: "pointer",
                  background:
                    index === highlightedIndex ? "#eee" : "transparent",
                }}
              >
                <strong>{c.name}</strong> — {c.mobile}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mobile */}
      <div style={{ marginTop: 10 }}>
        <input
          value={mobileInput}
          onChange={(e) => setMobileInput(e.target.value)}
          placeholder="Mobile"
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      {/* Address */}
      <div style={{ marginTop: 10 }}>
        <input
          value={addressInput}
          onChange={(e) => setAddressInput(e.target.value)}
          placeholder="Address"
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      {/* Stats */}
      {selectedCustomer && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #ddd",
            background: "#fafafa",
          }}
        >
          <div>Total Purchase: {selectedCustomer.totalPurchase}</div>
          <div>Paid: {selectedCustomer.paid}</div>
          <div>Balance: {selectedCustomer.balance}</div>
        </div>
      )}
    </div>
  );
}
