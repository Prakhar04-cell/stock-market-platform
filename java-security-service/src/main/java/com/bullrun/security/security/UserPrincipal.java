package com.bullrun.security.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class UserPrincipal implements UserDetails {

    private final String id;
    private final String email;
    private final String role;
    private final Set<GrantedAuthority> authorities;

    public UserPrincipal(String id, String email, String role) {
        this.id = id;
        this.email = email;
        this.role = role != null ? role.toUpperCase() : "TRADER";

        Set<GrantedAuthority> auths = new HashSet<>();
        if ("ADMIN".equalsIgnoreCase(this.role)) {
            auths.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
        } else {
            auths.add(new SimpleGrantedAuthority("ROLE_TRADER"));
            auths.add(new SimpleGrantedAuthority("ROLE_USER"));
        }
        this.authorities = Collections.unmodifiableSet(auths);
    }

    public String getId() {
        return id;
    }

    public String getRole() {
        return role;
    }

    public boolean isAdmin() {
        return "ADMIN".equalsIgnoreCase(this.role);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return email != null ? email : id;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
