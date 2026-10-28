package com.tecnocampus.LS2.protube_back.repository;

import com.tecnocampus.LS2.protube_back.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    // TODO: Guardar un usuario de prueba con los campos
    // Recuperarlo por su identificador
    //Comprobar que aparece PosgreSQL:

}
