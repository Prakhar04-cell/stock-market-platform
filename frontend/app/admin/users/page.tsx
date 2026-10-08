"use client";

import React, { useEffect, useState, useMemo } from "react";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Filter,
  RefreshCw,
} from "lucide-react";

interface AdminUserItem {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_verified?: boolean;
  roles?: string[];
  role?: string;
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "TRADER">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async (search = "") => {
    setIsLoading(true);
    try {
      const endpoint = search
        ? `/api/v1/admin/users?search=${encodeURIComponent(search)}`
        : "/api/v1/admin/users";
      const data = await apiRequest<AdminUserItem[]>(endpoint);
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
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

  const handleToggleStatus = async (user: AdminUserItem) => {
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

  // Client-side filtering for role and status
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isAdmin = u.roles?.includes("ADMIN") || u.role === "ADMIN";
      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "ADMIN" && isAdmin) ||
        (roleFilter === "TRADER" && !isAdmin);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.is_active) ||
        (statusFilter === "INACTIVE" && !u.is_active);

      return matchesRole && matchesStatus;
    });
  }, [users, roleFilter, statusFilter]);

  return (
    <div className="space-y-5 select-none">
      {/* Header */}
      <div className="bg-white border border-[#E5E7EB] p-4 rounded-2xl shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#111827] flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            User Accounts &amp; RBAC Governance
          </h1>
          <p className="text-xs text-[#6B7280] mt-0.5 font-normal">
            Manage trader accounts, roles (TRADER, ADMIN), and access permissions in real time.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-64">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search email, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs font-normal pl-8 h-9 rounded-xl"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white shrink-0 shadow-xs font-medium h-9 rounded-xl px-3"
            >
              Search
            </Button>
          </form>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs h-9 px-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#374151] font-medium outline-none focus:border-primary"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="TRADER">TRADER</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs h-9 px-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#374151] font-medium outline-none focus:border-primary"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setRoleFilter("ALL");
              setStatusFilter("ALL");
              loadUsers("");
            }}
            className="h-9 rounded-xl border-[#E5E7EB] text-xs text-[#4B5563]"
            title="Reset filters"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC]">
              <TableHead className="font-semibold text-xs text-[#475569]">User Email</TableHead>
              <TableHead className="font-semibold text-xs text-[#475569]">Full Name</TableHead>
              <TableHead className="font-semibold text-xs text-[#475569]">Role</TableHead>
              <TableHead className="font-semibold text-xs text-[#475569]">Status</TableHead>
              <TableHead className="font-semibold text-xs text-[#475569]">Registered At</TableHead>
              <TableHead className="font-semibold text-xs text-[#475569] text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={`skeleton-${idx}`} className="animate-pulse">
                  <TableCell>
                    <div className="h-4 bg-slate-200 rounded w-40"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 bg-slate-200 rounded-md w-16"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-5 bg-slate-200 rounded-full w-14"></div>
                  </TableCell>
                  <TableCell>
                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="h-6 bg-slate-200 rounded w-16 mx-auto"></div>
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isAdmin = u.roles?.includes("ADMIN") || u.role === "ADMIN";
                const roleName = isAdmin ? "ADMIN" : (u.roles?.[0] || u.role || "TRADER");

                return (
                  <TableRow key={u.id} className="hover:bg-[#F8FAFC]/60 transition-colors">
                    <TableCell className="font-medium text-[#111827] font-mono text-xs">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-[#4B5563] font-normal text-xs">{u.full_name || "—"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          isAdmin
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-cyan-50 text-cyan-700 border-cyan-200"
                        }`}
                      >
                        {isAdmin ? <ShieldCheck className="w-3 h-3 text-purple-600" /> : <Shield className="w-3 h-3 text-cyan-600" />}
                        {roleName}
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          u.is_active
                            ? "text-rose-600 hover:bg-rose-50 border border-rose-200"
                            : "text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                        }`}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] mb-2">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-[#111827]">No users found</p>
                    <p className="text-xs text-[#6B7280] max-w-sm mt-0.5">
                      {searchQuery
                        ? `No accounts matching "${searchQuery}". Try clearing search filters.`
                        : "No user accounts registered in this category."}
                    </p>
                    {(searchQuery || roleFilter !== "ALL" || statusFilter !== "ALL") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setRoleFilter("ALL");
                          setStatusFilter("ALL");
                          loadUsers("");
                        }}
                        className="mt-3 text-xs rounded-xl"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
