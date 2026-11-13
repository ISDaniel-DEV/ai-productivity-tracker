package com.isdanieldev.aiproductivitytracker.notebook;
import com.isdanieldev.aiproductivitytracker.user.UserEntity;
/** La implementación se decide según el modelo de identidad acordado. */
public interface OwnerProvider { UserEntity currentOwner(); }
