"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { formatDateTime } from "@/lib/utils";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async (search = "") => {
    setIsLoading(true);
    try {
      const endpoint = search
        ? `/api/v1/admin/users?search=${encodeURIComponent(search)}`
        : "/api/v1/admin/users";
      const data = await apiRequest(endpoint);
      setUsers(data);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(searchQuery);
  };

  const handleToggleStatus = async (user: any) => {
    const action = user.is_active ? "deactivate" : "activate";
    if (!confirm(`Are you sure you want to ${action} user ${user.email}? This will create an audit log.`)) return;

    try {
      await apiRequest(`/api/v1/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      loadUsers(searchQuery);
    } catch (err: any) {
      alert(err.message || "Failed to update user status");
    }
  };

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827] flex items-center gap-2">
            User Accounts &amp; RBAC Governance
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
            Manage trader accounts, roles (TRADER, ADMIN), and access permissions.
          </p>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-72">
          <Input
            placeholder="Search email, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs font-normal"
          />
          <Button type="submit" size="sm" className="bg-[#F97316] hover:bg-[#EA580C] text-white shrink-0 shadow-xs font-medium">
            Search
          </Button>
        </form>
      </div>

      {/* Users Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User Email</TableHead>
            <TableHead>Full Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Registered At</TableHead>
            <TableHead className="text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium text-[#111827] font-mono text-xs">
                {u.email}
              </TableCell>
              <TableCell className="text-[#4B5563] font-normal">{u.full_name || "—"}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    u.role === "ADMIN"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]"
                  }`}
                >
                  {u.role === "ADMIN" ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                  {u.role}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={u.is_active ? "success" : "danger"}>
                  {u.is_active ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-[#6B7280] font-mono">
                {formatDateTime(u.created_at)}
              </TableCell>
              <TableCell className="text-center">
                <button
                  onClick={() => handleToggleStatus(u)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    u.is_active
                      ? "text-rose-600 hover:bg-rose-50 border border-rose-200"
                      : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                  }`}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
